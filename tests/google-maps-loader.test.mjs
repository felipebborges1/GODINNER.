import test from "node:test";
import assert from "node:assert/strict";
import { createGoogleMapsLoader } from "../lib/google-maps-loader.ts";

function fixture(existing = false) {
  const scripts = [];
  const host = {};
  const doc = {
    createElement: () => ({}),
    querySelector: () => existing || scripts[0] || null,
    head: { appendChild: (script) => scripts.push(script) },
  };
  const loader = createGoogleMapsLoader(host, doc);
  const ready = () => {
    host.google = { maps: { importLibrary: async (name) => ({ [name]: true }) } };
    host.__godinnerMapsReady();
  };
  return { loader, host, scripts, ready };
}

test("concurrent Home and review loads share one SDK and wait for its callback", async () => {
  const f = fixture();
  const home = f.loader.load("test-only-public-key");
  const review = f.loader.load("test-only-public-key");
  assert.equal(home, review);
  assert.equal(f.scripts.length, 1);
  let settled = false;
  home.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
  f.ready();
  assert.equal(await home, await review);
  assert.equal(await f.loader.load("test-only-public-key"), await home);
  assert.equal(f.scripts.length, 1, "reopen/navigation must not append another script");
});

test("authentication failure AFTER script readiness reaches all mounted consumers", async () => {
  const f = fixture();
  const states = [];
  f.loader.subscribe((reason) => states.push(reason));
  const promise = f.loader.load("test-only-public-key");
  f.ready();
  await promise;
  f.host.gm_authFailure();
  assert.deepEqual(states, ["authorization"]);
  await assert.rejects(f.loader.load("test-only-public-key"), /authorization/);
  f.loader.subscribe((reason) => states.push(reason));
  assert.deepEqual(states, ["authorization", "authorization"]);
  assert.equal(f.scripts.length, 1, "no automated authorization retry loop");
});

test("authentication failure before readiness rejects pending load", async () => {
  const f = fixture();
  const promise = f.loader.load("test-only-public-key");
  f.host.gm_authFailure();
  await assert.rejects(promise, /authorization/);
  f.ready();
  await assert.rejects(f.loader.load("test-only-public-key"), /authorization/);
});

test("transport failure is map/network, never a GPS denial", async () => {
  const f = fixture();
  const states = [];
  f.loader.subscribe((reason) => states.push(reason));
  const promise = f.loader.load("test-only-public-key");
  f.scripts[0].onerror();
  await assert.rejects(promise, /network/);
  assert.deepEqual(states, ["network"]);
});

test("missing key fails without injecting or substituting a server key", async () => {
  const f = fixture();
  await assert.rejects(f.loader.load(), /unavailable/);
  assert.equal(f.scripts.length, 0);
});

test("unknown existing SDK is not loaded again", async () => {
  const f = fixture(true);
  await assert.rejects(f.loader.load("test-only-public-key"), /unavailable/);
  assert.equal(f.scripts.length, 0);
});

test("already available library is reused and failure subscribers can unsubscribe", async () => {
  const f = fixture();
  f.host.google = { maps: { importLibrary: async () => ({}) } };
  assert.equal(await f.loader.load("test-only-public-key"), f.host.google.maps);
  let calls = 0;
  const unsubscribe = f.loader.subscribe(() => calls++);
  unsubscribe();
  f.host.gm_authFailure();
  assert.equal(calls, 0);
  assert.equal(f.scripts.length, 0);
});

test("a stalled script is bounded and fails once without retrying", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture();
  const promise = f.loader.load("test-only-public-key");
  t.mock.timers.tick(15_001);
  await assert.rejects(promise, /network/);
  await assert.rejects(f.loader.load("test-only-public-key"), /network/);
  assert.equal(f.scripts.length, 1);
});
