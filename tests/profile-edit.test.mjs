import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { countProfileCharacters, normalizeProfileLink, validateProfileBio } from "../lib/profile-fields.ts";

const require = createRequire(import.meta.url);
const owner = "faf58818-129f-41cf-b878-32a89138adbe";
function compile(file, dependencies) {
  const js = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", js)(id => Object.hasOwn(dependencies, id) ? dependencies[id] : require(id), mod, mod.exports);
  return mod.exports;
}

function harness({ authenticated = true, writeError = null, profile = {} } = {}) {
  const row = { id: owner, avatar_url: `${owner}/old.jpg`, bio: "Bio original", website_url: null, ...profile };
  const events = [];
  let update = null;
  const query = {
    select() { return this; },
    eq(column, value) { events.push(["filter", column, value]); return this; },
    is(column, value) { events.push(["filter", column, value]); return this; },
    maybeSingle: async () => ({ data: { ...row }, error: null }),
    update(value) { update = value; events.push(["update", value]); return this; },
    single: async () => {
      if (writeError) return { data: null, error: { code: writeError } };
      Object.assign(row, update);
      events.push(["committed"]);
      return { data: { ...row }, error: null };
    },
  };
  const client = { auth: { getUser: async () => ({ data: { user: authenticated ? { id: owner } : null }, error: null }) }, from: () => query, storage: { from: () => ({ remove: async (paths) => { events.push(["delete", paths]); return { error: null }; } }) } };
  const route = compile("../app/api/profile/edit/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, { status: options?.status ?? 200 }) } },
    "@/lib/profile-fields": { countProfileCharacters, normalizeProfileLink, validateProfileBio },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => client },
  });
  async function send(payload) {
    const response = await route.PATCH(new Request("http://localhost/api/profile/edit", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
    return { status: response.status, body: await response.json() };
  }
  return { send, row, events };
}

const base = { bio: "Bio original", website: "", expectedAvatarPath: `${owner}/old.jpg`, avatar: { action: "keep" } };

test("bio counts grapheme clusters, including composed accents and family emoji", () => {
  assert.equal(countProfileCharacters("a👨‍👩‍👧‍👦é\ne\u0301"), 5);
  assert.equal(validateProfileBio("👨‍👩‍👧‍👦".repeat(150)).error, null);
  assert.match(validateProfileBio("👨‍👩‍👧‍👦".repeat(151)).error, /150/);
});

test("website accepts one external HTTP(S) link and normalizes protocol", () => {
  assert.equal(normalizeProfileLink(" exemplo.com.br/cafe ").value, "https://exemplo.com.br/cafe");
  assert.equal(normalizeProfileLink("http://exemplo.com.br").value, "http://exemplo.com.br/");
  assert.equal(normalizeProfileLink("").value, null);
  for (const value of ["javascript:alert(1)", "ftp://exemplo.com", "https://user:pass@exemplo.com", "localhost", "https://exemplo.com outro.com"]) {
    assert.ok(normalizeProfileLink(value).error, value);
  }
});

test("anonymous user cannot edit a profile", async () => {
  const h = harness({ authenticated: false });
  assert.equal((await h.send(base)).status, 401);
  assert.deepEqual(h.events, []);
});

test("client supplied user ID is ignored; only authenticated profile is updated", async () => {
  const h = harness();
  const result = await h.send({ ...base, userId: "another-user", bio: "Nova bio", website: "meusite.com" });
  assert.equal(result.status, 200);
  assert.equal(result.body.website, "https://meusite.com/");
  assert.deepEqual(h.events.find(e => e[0] === "update")[1], { bio: "Nova bio", website_url: "https://meusite.com/" });
  assert.ok(h.events.some(e => e[0] === "filter" && e[1] === "id" && e[2] === owner));
});

test("invalid bio and unsafe link are rejected before any write", async () => {
  const h = harness();
  assert.equal((await h.send({ ...base, bio: "🙂".repeat(151) })).status, 400);
  assert.equal((await h.send({ ...base, website: "javascript:alert(1)" })).status, 400);
  assert.equal(h.events.some(e => e[0] === "update"), false);
});

test("old avatar is deleted only after replacing or removing it successfully", async () => {
  const h = harness();
  const replacement = `${owner}/12345678-1234-1234-1234-123456789abc.webp`;
  assert.equal((await h.send({ ...base, avatar: { action: "replace", path: replacement } })).status, 200);
  assert.equal(h.row.avatar_url, replacement);
  assert.ok(h.events.findIndex(e => e[0] === "committed") < h.events.findIndex(e => e[0] === "delete"));
  assert.deepEqual(h.events.find(e => e[0] === "delete")[1], [`${owner}/old.jpg`]);

  const remove = harness();
  assert.equal((await remove.send({ ...base, avatar: { action: "remove" } })).status, 200);
  assert.equal(remove.row.avatar_url, null);
});

test("failure, missing migration, stale avatar and foreign storage path preserve previous data", async () => {
  const failure = harness({ writeError: "DB_ERROR" });
  assert.equal((await failure.send({ ...base, avatar: { action: "remove" } })).status, 409);
  assert.equal(failure.row.avatar_url, `${owner}/old.jpg`);
  assert.equal(failure.events.some(e => e[0] === "delete"), false);

  const missing = harness({ writeError: "42703" });
  assert.equal((await missing.send({ ...base, website: "meusite.com" })).status, 503);
  assert.equal(missing.row.website_url, null);

  const stale = harness();
  assert.equal((await stale.send({ ...base, expectedAvatarPath: "older.jpg" })).status, 409);
  assert.equal(stale.events.some(e => e[0] === "update"), false);

  const foreign = harness();
  assert.equal((await foreign.send({ ...base, avatar: { action: "replace", path: "foreign/picture.jpg" } })).status, 400);
  assert.equal(foreign.events.some(e => e[0] === "update"), false);
});
