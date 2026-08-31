import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import TypeScript from "typescript";

const baseRequire = createRequire(import.meta.url);

async function loadCurrency() {
  const source = await readFile(new URL("../lib/currency.ts", import.meta.url), "utf8");
  const compiled = TypeScript.transpileModule(source, { compilerOptions: { module: TypeScript.ModuleKind.CommonJS, target: TypeScript.ScriptTarget.ES2022 } });
  const compiledModule = { exports: {} };
  new Function("exports", "require", "module", compiled.outputText)(compiledModule.exports, baseRequire, compiledModule);
  return compiledModule.exports;
}

test("resolves supported restaurant countries to ISO currencies", async () => {
  const { getCurrencyForCountry } = await loadCurrency();
  assert.equal(getCurrencyForCountry("ES"), "EUR");
  assert.equal(getCurrencyForCountry("NL"), "EUR");
  assert.equal(getCurrencyForCountry("BR"), "BRL");
  assert.equal(getCurrencyForCountry("PT"), "EUR");
  assert.equal(getCurrencyForCountry("FR"), "EUR");
  assert.equal(getCurrencyForCountry("US"), "USD");
  assert.equal(getCurrencyForCountry("GB"), "GBP");
  assert.equal(getCurrencyForCountry("XX"), null);
});

test("migration persists only the country and currency metadata during historical backfill", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260831000000_country_currency_backfill.sql", import.meta.url), "utf8");
  assert.match(migration, /add column if not exists country_code text/);
  assert.match(migration, /add column if not exists currency text/);
  assert.match(migration, /country_code ~ '\^\[A-Z\]\{2\}\$'/);
  assert.match(migration, /currency ~ '\^\[A-Z\]\{3\}\$'/);
  assert.match(migration, /when 'ES' then 'EUR'/);
  assert.match(migration, /when 'NL' then 'EUR'/);
  assert.match(migration, /alter table public\.reviews disable trigger reviews_set_updated_at/);
  assert.match(migration, /set currency = public\.currency_for_country\(restaurant\.country_code\)/);
  assert.doesNotMatch(migration, /set amount_per_person\s*=/);
});

test("Google Places country and server-side review currency are persisted without a client currency parameter", async () => {
  const [google, route, reviewForm, editForm] = await Promise.all([
    readFile(new URL("../lib/google-place-discovery.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/restaurants/from-google-place/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/review/review-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/review/review-edit-form.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(google, /countryCode: address\.countryCode/);
  assert.match(route, /country_code: details\.countryCode \?\? null/);
  assert.match(reviewForm, /getCurrencyForCountry\(restaurant\.countryCode\)/);
  assert.match(editForm, /review\.currency \?\? getCurrencyForCountry\(restaurant\.countryCode\)/);
});
