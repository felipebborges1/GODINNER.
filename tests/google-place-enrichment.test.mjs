import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React, { act } from "react";
import TestRenderer from "react-test-renderer";

const require = createRequire(import.meta.url);
function compile(file, deps = {}) {
  const js = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", js)(id => Object.hasOwn(deps, id) ? deps[id] : require(id), mod, mod.exports);
  return mod.exports;
}
const matcher = compile("../lib/google-place-match.ts", { "@/lib/distance": compile("../lib/distance.ts") });
const row = { id: "isolated", name: "nashy", address: "Rua Teste, 1972 - Lourdes", city: "Belo Horizonte", latitude: null, longitude: null, google_place_id: null, status: "published" };
const candidate = { placeId: "google-test", name: "Nashy Sushi BH", address: row.address, city: row.city, types: ["restaurant"] };
const match = (r, candidates) => matcher.matchGoogleRestaurant(r, candidates);

test("matches the reported longer trading names only at identical address and city", () => {
  assert.equal(match(row, [candidate]).status, "matched");
  assert.equal(match({ ...row, name: "Est! Est! Est!" }, [{ ...candidate, name: "Est! Est!! Est!!! Ristorante Italiano" }]).status, "matched");
});
test("rejects different unit, missing city, generic names and partial words", () => {
  for (const change of [{ address: "Rua Teste, 1973 - Lourdes" }, { city: "Outra cidade" }, { city: undefined }, { name: "Nashyville Sushi" }, { name: "Novo Nashy Sushi" }]) assert.equal(match(row, [{ ...candidate, ...change }]).status, "unmatched");
  assert.equal(match({ ...row, name: "Bar" }, [{ ...candidate, name: "Bar do Centro" }]).status, "unmatched");
  assert.equal(match({ ...row, name: "" }, [candidate]).status, "unmatched");
});
test("ambiguous matching fails closed; duplicate same place ID is not ambiguity", () => {
  assert.equal(match(row, [candidate, { ...candidate, placeId: "other", name: "Nashy Restaurante" }]).status, "ambiguous");
  assert.equal(match(row, [candidate, candidate]).status, "matched");
});
test("exact-name proximity remains supported; proximity alone cannot match an extended name", () => {
  const r = { ...row, latitude: 10, longitude: 10 };
  const nearby = { ...candidate, coordinates: { latitude: 10, longitude: 10 }, address: "Outro endereço" };
  assert.equal(match(r, [nearby]).status, "unmatched");
  assert.equal(match(r, [{ ...nearby, name: "Nashy" }]).status, "matched");
  assert.equal(match(row, [{ ...nearby, name: "Nashy" }]).status, "unmatched");
});

function routeHarness({ user = true, role = "admin", restaurant = row, candidates = [candidate], searchFails = false, saveFails = false } = {}) {
  const writes = [], filters = [], searches = [];
  const client = { auth: { getUser: async () => ({ data: { user: user ? { id: "admin" } : null } }) }, from(table) {
    const chain = {
      select: () => chain,
      eq: (key, value) => { filters.push([table, key, value]); return chain; },
      is: (key, value) => { filters.push([table, key, value]); return chain; },
      maybeSingle: async () => ({ data: table === "profiles" ? { role } : restaurant, error: null }),
      update: value => { writes.push(value); return chain; },
      single: async () => ({ data: saveFails ? null : { ...restaurant, ...writes.at(-1) }, error: saveFails ? { message: "private database detail" } : null }),
    };
    return chain;
  } };
  const route = compile("../app/api/admin/restaurants/[id]/enrich/route.ts", {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => client },
    "@/lib/supabase/mappers": { mapRestaurant: value => value },
    "@/lib/duo-gourmet": { verifyDuoGourmet: () => ({ checked: false }) },
    "@/lib/google-place-match": matcher,
    "@/lib/google-place-discovery": { searchGooglePlaces: async query => { searches.push(query); if (searchFails) throw new Error("private upstream detail"); return candidates; } },
  });
  return { writes, filters, searches, call: () => route.POST(new Request("https://isolated.invalid", { method: "POST" }), { params: Promise.resolve({ id: row.id }) }) };
}
test("authorized admin matches without changing approval, history, reviews or photo URLs", async () => {
  const h = routeHarness(); const response = await h.call();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).google, "matched");
  assert.deepEqual(h.writes, [{ google_place_id: candidate.placeId }]);
  assert.ok(h.filters.some(([, key, value]) => key === "google_place_id" && value === null));
  assert.ok(h.filters.filter(([, key, value]) => key === "status" && value === "published").length >= 2);
});
test("anonymous and ordinary users cannot search or mutate via admin enrichment", async () => {
  for (const [options, status] of [[{ user: false }, 401], [{ role: "user" }, 403]]) {
    const h = routeHarness(options); assert.equal((await h.call()).status, status);
    assert.equal(h.searches.length, 0); assert.equal(h.writes.length, 0);
  }
});
test("missing or protected restaurant is not enriched", async () => {
  const h = routeHarness({ restaurant: null }); assert.equal((await h.call()).status, 404);
  assert.equal(h.searches.length, 0); assert.equal(h.writes.length, 0);
});
test("existing Google identity is preserved without a new search", async () => {
  const h = routeHarness({ restaurant: { ...row, google_place_id: "existing" } });
  assert.equal((await (await h.call()).json()).google, "existing");
  assert.equal(h.searches.length, 0); assert.equal(h.writes.length, 0);
});
test("no match, ambiguity and upstream failure are distinct and do not write a Google link", async () => {
  for (const [options, status] of [[{ candidates: [] }, "unmatched"], [{ candidates: [candidate, { ...candidate, placeId: "other" }] }, "ambiguous"], [{ searchFails: true }, "error"]]) {
    const h = routeHarness(options); const result = await (await h.call()).json();
    assert.equal(result.google, status); assert.equal(h.writes.length, 0);
    assert.ok(!JSON.stringify(result).includes("private upstream"));
  }
});
test("failed or concurrent write never reports success or leaks database details", async () => {
  const h = routeHarness({ saveFails: true }); const response = await h.call();
  assert.equal(response.status, 409);
  assert.equal((await response.json()).google, "error");
});

const { AdminGoogleEnrichment } = compile("../components/admin/admin-google-enrichment.tsx");
test("admin retry is explicit, single-flight, reports errors and refreshes after success", async t => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const originalFetch = globalThis.fetch; t.after(() => { globalThis.fetch = originalFetch; delete globalThis.IS_REACT_ACT_ENVIRONMENT; });
  let calls = 0, refreshes = 0, resolve;
  globalThis.fetch = () => { calls++; return new Promise(r => { resolve = r; }); };
  let view;
  await act(async () => { view = TestRenderer.create(React.createElement(AdminGoogleEnrichment, { restaurantId: "test", linked: false, onUpdated: () => refreshes++ })); });
  assert.equal(calls, 0);
  await act(async () => { const click = view.root.findByType("button").props.onClick; click(); click(); });
  assert.equal(calls, 1); assert.equal(view.root.findByType("button").props.disabled, true);
  await act(async () => resolve({ ok: false, json: async () => ({ google: "error" }) }));
  assert.match(view.root.findByProps({ role: "status" }).children.join(""), /continua aprovado/);
  assert.equal(refreshes, 0);
  await act(async () => view.root.findByType("button").props.onClick());
  await act(async () => resolve({ ok: true, json: async () => ({ google: "matched" }) }));
  assert.equal(refreshes, 1); assert.equal(calls, 2);
  await act(async () => view.unmount());
});
