import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canCheckCatalogCoverage, catalogCoverageKey, getCatalogCoverageSessionId } from "../lib/catalog-coverage.ts";

test("coverage keys are accent-insensitive and preserve city/state/country scope", () => {
  assert.equal(catalogCoverageKey({ city: "Florianópolis", region: "Santa Catarina", countryCode: "br" }), catalogCoverageKey({ city: " Florianopolis ", region: "SANTA  CATARINA", countryCode: "BR" }));
  assert.notEqual(catalogCoverageKey({ city: "Cuiabá", region: "Mato Grosso", countryCode: "BR" }), catalogCoverageKey({ city: "Cuiabá", region: "Mato Grosso do Sul", countryCode: "BR" }));
  assert.equal(canCheckCatalogCoverage("device", { placeId: "device", city: "Cuiabá", countryCode: "BR" }), true);
  assert.equal(canCheckCatalogCoverage("manual", { placeId: "place", city: "Cuiabá", countryCode: "BR" }), false);
});

test("one opaque session identifier is reused instead of generating render-level demand", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.equal(getCatalogCoverageSessionId(storage, () => "session-a"), "session-a");
  assert.equal(getCatalogCoverageSessionId(storage, () => "session-b"), "session-a");
});

test("COV1 keeps coordinates out of coverage persistence and protects server aggregates", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260908160000_catalog_coverage_requests.sql", import.meta.url), "utf8");
  const schema = migration.replace(/^--.*$/gm, "");
  const hook = await readFile(new URL("../hooks/use-catalog-coverage.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/location/resolve/route.ts", import.meta.url), "utf8");
  assert.match(schema, /security definer/);
  assert.match(schema, /revoke all on public\.catalog_coverage_requests from anon, authenticated/);
  assert.match(schema, /on conflict \(coverage_request_id, actor_key\)/);
  assert.match(schema, /signal_count = signal_count \+ 1/);
  assert.match(schema, /unique_user_count = unique_user_count \+ case when actor_type = 'user'/);
  assert.doesNotMatch(schema, /latitude|longitude|email|username|fingerprint/i);
  assert.match(hook, /attempted\.current\.has/);
  assert.match(hook, /fallbackPublishedCount === 0/);
  assert.match(route, /Cache-Control/);
  assert.doesNotMatch(route, /console\.|logger/i);
});

test("Home presents the approved zero-coverage copy without a notification promise", async () => {
  const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const state = await readFile(new URL("../components/discover/zero-coverage-state.tsx", import.meta.url), "utf8");
  assert.match(home, /useCatalogCoverage/);
  assert.match(home, /coverage\.isZeroCoverage/);
  assert.match(state, /Estamos chegando a/);
  assert.match(state, /Explorar lugares no GODINNER/);
  assert.doesNotMatch(state, /me avise|notifica/i);
});
