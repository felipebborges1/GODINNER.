import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
function compile(file, dependencies = {}) {
  const js = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", js)(id => dependencies[id] ?? require(id), mod, mod.exports);
  return mod.exports;
}
const service = compile("../lib/google-place-discovery.ts", {
  "server-only": {},
  "@/lib/restaurant-location": compile("../lib/restaurant-location.ts"),
});
const dining = { id: "dining", displayName: { text: "O Amarelinho" }, primaryType: "brazilian_restaurant", types: ["restaurant", "food", "establishment"], formattedAddress: "Endereço público", location: { latitude: 1, longitude: 2 } };
const jobs = { ...dining, id: "jobs", displayName: { text: "O Amarelinho - Vagas de Emprego" }, primaryType: "corporate_office", types: ["point_of_interest", "establishment"] };
function mockGoogle(t, replies) {
  const calls = [], originalFetch = globalThis.fetch, originalKey = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "isolated-test-key";
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: options.body ? JSON.parse(options.body) : null });
    const reply = replies.shift();
    assert.ok(reply, "No unbounded queries allowed");
    return { ok: !reply.failure, status: reply.failure ?? 200, json: async () => reply };
  };
  t.after(() => { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY; else process.env.GOOGLE_PLACES_API_KEY = originalKey; });
  return calls;
}

test("accepts dining categories, not names or generic food/establishment", () => {
  for (const type of ["restaurant", "brazilian_restaurant", "bar", "pub", "cafe", "bakery", "coffee_shop", "meal_takeaway", "steak_house"]) assert.equal(service.isDiningPlace({ primaryType: type }), true, type);
  for (const type of ["corporate_office", "supermarket", "food", "establishment", "store", "point_of_interest"]) assert.equal(service.isDiningPlace({ primaryType: type }), false, type);
  assert.equal(service.isDiningPlace({}), false);
  assert.equal(service.isDiningPlace({ types: [] }), false);
  assert.equal(service.isDiningPlace({ types: ["cafe"] }), true);
  assert.equal(service.isDiningPlace(jobs), false);
});

test("mixed text results keep restaurants/bars/cafes and discard employment office", async t => {
  const calls = mockGoogle(t, [{ places: [jobs, dining, { ...dining, id: "cafe", primaryType: "cafe", types: ["cafe"] }] }]);
  assert.deepEqual((await service.searchGooglePlaces("amarelinho")).map(p => p.placeId), ["dining", "cafe"]);
  assert.equal(calls.length, 1);
});

test("employment namesake triggers one strict restaurant search preserving query and bias", async t => {
  const calls = mockGoogle(t, [{ places: [jobs] }, { places: [dining, jobs] }]);
  const position = { latitude: 1, longitude: 2 };
  assert.deepEqual((await service.searchGooglePlaces("amarelinho, Lisboa", { position })).map(p => p.placeId), ["dining"]);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body.textQuery, "amarelinho, Lisboa");
  assert.equal(calls[1].body.includedType, "restaurant");
  assert.equal(calls[1].body.strictTypeFiltering, true);
  assert.deepEqual(calls[1].body.locationBias, calls[0].body.locationBias);
});

test("unknown/empty categories fail closed even in Google's strict response", async t => {
  const unknown = { ...dining, primaryType: undefined, types: [] };
  const calls = mockGoogle(t, [{ places: [unknown] }, { places: [unknown, jobs] }]);
  assert.deepEqual(await service.searchGooglePlaces("unknown"), []);
  assert.equal(calls.length, 2);
});

test("no matches stay empty and a short term never calls Google", async t => {
  const calls = mockGoogle(t, [{}, {}]);
  assert.deepEqual(await service.searchGooglePlaces("x"), []);
  assert.equal(calls.length, 0);
  assert.deepEqual(await service.searchGooglePlaces("nothing"), []);
  assert.equal(calls.length, 2);
});

test("strict fallback failure is reported, never replaced with invalid results", async t => {
  const calls = mockGoogle(t, [{ places: [jobs] }, { failure: 503 }]);
  await assert.rejects(service.searchGooglePlaces("amarelinho"), /HTTP 503/);
  assert.equal(calls.length, 2);
});

test("nearby results also require a dining category", async t => {
  mockGoogle(t, [{ places: [jobs, dining] }]);
  assert.deepEqual((await service.searchGooglePlacesNearby({ latitude: 1, longitude: 2 })).map(p => p.placeId), ["dining"]);
});

test("details revalidate category for stale or forged selections", async t => {
  mockGoogle(t, [jobs, dining]);
  await assert.rejects(service.getGooglePlaceDetails("jobs"), service.GooglePlaceCategoryError);
  assert.equal((await service.getGooglePlaceDetails("dining")).placeId, "dining");
});

test("creation endpoint returns safe 422 before any database access for non-dining", async t => {
  mockGoogle(t, [jobs]);
  let databaseCalls = 0;
  const route = compile("../app/api/restaurants/from-google-place/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/google-place-discovery": service,
    "@/lib/distance": { distanceKm: () => 0 },
    "@/lib/search": { normalize: text => text },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "isolated" } } }) }, from: () => { databaseCalls++; throw new Error("No DB access expected"); } }) },
  });
  const response = await route.POST({ json: async () => ({ placeId: "jobs" }) });
  assert.equal(response.status, 422);
  assert.match(response.body.error, /não está classificado/);
  assert.equal(databaseCalls, 0);
});
