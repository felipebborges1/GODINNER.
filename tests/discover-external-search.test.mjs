import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Discover keeps catalog search first and exposes Google only after an explicit action", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /filterRestaurants\(eligibleRestaurants, \{ q: searchQuery \}/);
  assert.match(page, /discover_search_no_results/);
  assert.match(page, /Buscar “\{searchQuery\.trim\(\)\}” perto de mim/);
  assert.match(page, /Buscar outros restaurantes/);
  assert.match(page, /onClick=\{searchOutsideCatalog\}/);
  assert.match(page, /const searchOutsideCatalog = \(\) =>/);
  assert.match(page, /onClick=\{searchOutsideCatalog\}/);
});

test("Discover external fallback preserves the query, handles denied location, and keeps Google results attributed", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /searchExternalPlaces\(query, locationBias\)/);
  assert.match(page, /void runExternalSearch\(query, attempt\)/);
  assert.match(page, /Dados fornecidos pelo Google/);
  assert.match(page, /Encontrado via Google/);
  assert.match(page, /Não conseguimos buscar outros lugares agora\./);
  assert.match(page, /clearExternalSearch\(\)/);
});

test("Existing Places open the catalog profile and new Places reuse the review/new flow without automatic creation", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const newRestaurant = await readFile(new URL("../components/restaurant/new-restaurant-client.tsx", import.meta.url), "utf8");
  assert.match(page, /restaurant\.googlePlaceId === place\.placeId/);
  assert.match(page, /router\.push\(`\/restaurant\/\$\{existing\.slug\}`\)/);
  assert.match(page, /Avaliar este lugar/);
  assert.match(page, /router\.push\(reviewNewUrl\(selectedExternalPlace\)\)/);
  assert.match(newRestaurant, /selectedPlaceFromParams/);
  assert.match(newRestaurant, /createRestaurantFromGooglePlace\(selectedPlace\.placeId/);
});

test("Google Places client calls remain shared and server-side routes keep the key private", async () => {
  const hook = await readFile(new URL("../hooks/use-google-place-search.ts", import.meta.url), "utf8");
  const service = await readFile(new URL("../lib/google-place-discovery.ts", import.meta.url), "utf8");
  assert.match(hook, /\/api\/google-places\/search/);
  assert.match(hook, /\/api\/google-places\/nearby/);
  assert.match(service, /import "server-only"/);
  assert.match(service, /locationBias/);
  assert.doesNotMatch(service, /countryCode: "BR"/);
  assert.doesNotMatch(hook, /NEXT_PUBLIC_GOOGLE_PLACES_API_KEY/);
});

test("Discover external result cards stay responsive and reveal the selected-place confirmation", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /selectedPlaceConfirmationRef/);
  assert.match(page, /scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
  assert.match(page, /min-w-0 max-w-full/);
  assert.match(page, /line-clamp-2/);
  assert.match(page, /formatPlaceDistance/);
  assert.match(page, /aria-pressed=\{isSelected\}/);
});
