import assert from "node:assert/strict";
import test from "node:test";
import { createLocationRequestCoordinator } from "../lib/location/location-request-coordinator.ts";

type Success = PositionCallback;
type Failure = PositionErrorCallback;

function browserPosition({ accuracy = 45, timestamp = 1_000 }: { accuracy?: number; timestamp?: number } = {}) {
  return { coords: { latitude: -19.9, longitude: -43.9, accuracy }, timestamp } as GeolocationPosition;
}

function browserError(code: number, message = "location error") {
  return { code, message } as GeolocationPositionError;
}

function deferredGeolocation() {
  let success: Success | undefined;
  let failure: Failure | undefined;
  let calls = 0;
  return {
    api: { getCurrentPosition: (nextSuccess: Success, nextFailure: Failure) => { calls += 1; success = nextSuccess; failure = nextFailure; } } as Pick<Geolocation, "getCurrentPosition">,
    calls: () => calls,
    succeed: (position = browserPosition()) => success?.(position),
    fail: (error: GeolocationPositionError) => failure?.(error),
  };
}

test("location coordinator accepts a precise successful position and reports elapsed metadata", async () => {
  const geolocation = deferredGeolocation();
  let now = 1_000;
  const diagnostics: unknown[] = [];
  const coordinator = createLocationRequestCoordinator({ getGeolocation: () => geolocation.api, now: () => now, onDiagnostic: (event) => diagnostics.push(event) });
  const result = coordinator.request("click");
  now = 1_250;
  geolocation.succeed(browserPosition({ accuracy: 80, timestamp: 1_200 }));
  assert.deepEqual(await result, { ok: true, attemptId: "location-1", latitude: -19.9, longitude: -43.9, elapsedMs: 250, accuracyMeters: 80, positionAgeMs: 50 });
  assert.equal(geolocation.calls(), 1);
  assert.equal(diagnostics.length, 2);
});

test("location coordinator distinguishes denied, unavailable, and timeout failures", async () => {
  for (const [code, reason] of [[1, "denied"], [2, "unavailable"], [3, "timeout"]] as const) {
    const geolocation = deferredGeolocation();
    const coordinator = createLocationRequestCoordinator({ getGeolocation: () => geolocation.api });
    const first = coordinator.request("click");
    geolocation.fail(browserError(code));
    const firstResult = await first;
    assert.equal(firstResult.ok, false);
    if (!firstResult.ok) assert.equal(firstResult.reason, reason);
    const retry = coordinator.request("click");
    assert.equal(geolocation.calls(), 2, "a new attempt must be possible after failure");
    geolocation.fail(browserError(code));
    assert.equal((await retry).ok, false);
  }
  const unsupported = await createLocationRequestCoordinator({ getGeolocation: () => null }).request("click");
  assert.deepEqual(unsupported, { ok: false, attemptId: "location-1", reason: "unsupported", elapsedMs: 0 });
});

test("automatic and click requests share one browser acquisition", async () => {
  const geolocation = deferredGeolocation();
  const coordinator = createLocationRequestCoordinator({ getGeolocation: () => geolocation.api });
  const automatic = coordinator.request("automatic", "granted");
  const click = coordinator.request("click", "granted");
  assert.equal(geolocation.calls(), 1);
  geolocation.succeed();
  assert.equal((await automatic).ok, true);
  assert.equal((await click).ok, true);
});

test("manual selection cancels a pending request and an obsolete late result is discarded", async () => {
  const geolocation = deferredGeolocation();
  const diagnostics: { event: string }[] = [];
  const coordinator = createLocationRequestCoordinator({ getGeolocation: () => geolocation.api, onDiagnostic: (event) => diagnostics.push(event) });
  const pending = coordinator.request("click");
  coordinator.cancel();
  const cancelled = await pending;
  assert.equal(cancelled.ok, false);
  if (!cancelled.ok) assert.equal(cancelled.reason, "cancelled");
  geolocation.succeed();
  assert.ok(diagnostics.some((event) => event.event === "late-response"));
});

test("a low-confidence cached position is not used as a five-kilometer origin", async () => {
  const geolocation = deferredGeolocation();
  const coordinator = createLocationRequestCoordinator({ getGeolocation: () => geolocation.api, maximumAccuracyMeters: 5_000 });
  const result = coordinator.request("click");
  geolocation.succeed(browserPosition({ accuracy: 5_001 }));
  const rejected = await result;
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.reason, "inaccurate");
});
