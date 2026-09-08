import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadAddressParser() {
  const source = await readFile(new URL("../lib/restaurant-location.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

test("Google Places discovery is server-side, bounded, and uses location bias without a country restriction", async () => {
  const source = await readFile(new URL("../lib/google-place-discovery.ts", import.meta.url), "utf8");
  assert.match(source, /import "server-only"/);
  assert.match(source, /GOOGLE_PLACES_API_KEY/);
  assert.match(source, /maxResultCount: 6/);
  assert.match(source, /locationBias/);
  assert.match(source, /includedTypes: \["restaurant", "cafe", "bar", "bakery", "meal_takeaway"\]/);
  assert.doesNotMatch(source, /countryCode: "BR"/);
});

test("Google selection deduplicates before a pending restaurant is inserted", async () => {
  const route = await readFile(new URL("../app/api/restaurants/from-google-place/route.ts", import.meta.url), "utf8");
  assert.match(route, /eq\("google_place_id", details\.placeId\)/);
  assert.match(route, /secondaryMatch/);
  assert.match(route, /status: "pending_review"/);
  assert.match(route, /google_place_id: details\.placeId/);
  assert.match(route, /submitted_by: userData\.user\.id/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_GOOGLE_PLACES_API_KEY/);
});

test("new restaurant review flow keeps Google discovery, nearby search, map and manual fallback together", async () => {
  const component = await readFile(new URL("../components/restaurant/new-restaurant-client.tsx", import.meta.url), "utf8");
  assert.match(component, /Digite o nome do restaurante/);
  assert.match(component, /Usar minha localização/);
  assert.match(component, /Selecionar no mapa/);
  assert.match(component, /Preencher manualmente/);
  assert.match(component, /createRestaurantFromGooglePlace/);
  assert.match(component, /ReviewForm restaurant=\{created\}/);
  assert.match(component, /Permissão de localização negada|Não conseguimos acessar sua localização/);
});

test("public restaurant creation entry points lead with the unified evaluation journey without a manual-result CTA", async () => {
  const [desktopHeader, bottomNavigation, searchExplorer, selector, fallback] = await Promise.all([
    readFile(new URL("../components/layout/desktop-header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/layout/bottom-navigation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/search/search-explorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/review/restaurant-selector.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/restaurant/new-restaurant-client.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(desktopHeader, /href="\/review\/new"[^>]*><Plus size=\{16\}\/>Avaliar/);
  assert.doesNotMatch(desktopHeader, /<Plus size=\{16\}\/>Registrar/);
  assert.match(bottomNavigation, /href="\/review\/new" aria-label="Avaliar experiência"/);
  assert.match(searchExplorer, /Lugares encontrados/);
  assert.match(searchExplorer, /text-lg font-black text-orange-600/);
  assert.doesNotMatch(searchExplorer, /LUGARES ENCONTRADOS/);
  assert.match(searchExplorer, /px-5 py-5 text-center sm:px-6 sm:py-12/);
  assert.match(searchExplorer, /mt-3 rounded-3xl border border-stone-200/);
  assert.match(searchExplorer, /id="google-place-results"/);
  assert.match(selector, /Qual lugar você quer avaliar\?/);
  assert.match(selector, /Buscar mais lugares/);
  assert.doesNotMatch(selector, /Informar os dados do lugar/);
  assert.doesNotMatch(selector, /onManualFallback/);
  assert.match(fallback, /Preencher manualmente/);
});

test("Google address components from Places API keep international city and country fields", async () => {
  const { parseRestaurantAddress } = await loadAddressParser();
  const barcelona = parseRestaurantAddress({
    formatted_address: "Carrer de Mallorca, Barcelona, Espanya",
    address_components: [
      { longText: "Barcelona", types: ["locality", "political"] },
      { longText: "Catalunya", types: ["administrative_area_level_1", "political"] },
      { longText: "Espanya", types: ["country", "political"] },
    ],
  });
  assert.deepEqual(barcelona, { address: "Carrer de Mallorca, Barcelona, Espanya", city: "Barcelona", neighborhood: undefined, region: "Catalunya", country: "Espanya" });
});
