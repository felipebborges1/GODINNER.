import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("L1 keeps manual exploration separate from temporary device coordinates", async () => {
  const source = await readFile(new URL("../context/explore-location-context.tsx", import.meta.url), "utf8");
  assert.match(source, /godinner\.explore-region\.v1/);
  assert.match(source, /window\.localStorage\.setItem/);
  assert.match(source, /setDevicePosition\(null\)/);
  assert.match(source, /maximumAge: 0/);
  assert.match(source, /requestId !== requestVersion\.current/);
  assert.doesNotMatch(source, /latitude.*localStorage|localStorage.*latitude/);
});

test("L1 removes catalog-wide fake distance origins", async () => {
  const mapper = await readFile(new URL("../lib/supabase/mappers.ts", import.meta.url), "utf8");
  const ranking = await readFile(new URL("../lib/ai/ranking.ts", import.meta.url), "utf8");
  assert.doesNotMatch(mapper, /FALLBACK_COORDINATES/);
  assert.match(mapper, /distanceKm: Number\.POSITIVE_INFINITY/);
  assert.doesNotMatch(ranking, /FALLBACK_COORDINATES/);
  assert.match(ranking, /sem ordenar por distância/);
});

test("Discover and Search share the location picker without a BH/Nova Lima default", async () => {
  const discover = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const search = await readFile(new URL("../components/search/search-explorer.tsx", import.meta.url), "utf8");
  assert.match(discover, /ExploreLocationPicker/);
  assert.match(search, /ExploreLocationPicker/);
  assert.doesNotMatch(discover, /useState\("Vila da Serra \/ Nova Lima"\)/);
  assert.doesNotMatch(discover, /\["0,5 km", "0,9 km"/);
  assert.match(search, /if \(params\.city \|\| mode !== "manual"/);
  assert.match(search, /onManualSelected=\{clearLocationFilters\}/);
});

test("manual region selection remains structured and uses the existing server-side Places boundary", async () => {
  const picker = await readFile(new URL("../components/location/explore-location-picker.tsx", import.meta.url), "utf8");
  assert.match(picker, /placeId: place\.placeId/);
  assert.match(picker, /countryCode: place\.countryCode/);
  assert.match(picker, /searchPlaces\(`/);
  assert.doesNotMatch(picker, /NEXT_PUBLIC_GOOGLE_PLACES_API_KEY/);
});

test("L1.1 keeps search optional while sharing a discreet one-session location invitation", async () => {
  const context = await readFile(new URL("../context/explore-location-context.tsx", import.meta.url), "utf8");
  const nudge = await readFile(new URL("../components/location/location-search-nudge.tsx", import.meta.url), "utf8");
  const discover = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const search = await readFile(new URL("../components/search/search-explorer.tsx", import.meta.url), "utf8");
  assert.match(context, /navigator\.permissions\?\.query/);
  assert.match(context, /permission\.state === "granted"/);
  assert.match(context, /godinner\.location-nudge\.dismissed\.v1/);
  assert.match(context, /godinner\.explore-region\.all\.v1/);
  assert.match(context, /label = mode === "device" \? "Perto de mim"/);
  assert.match(context, /"Todas as regiões"/);
  assert.match(nudge, /Quer encontrar lugares perto de você\?/);
  assert.match(nudge, /Agora não/);
  assert.match(discover, /Onde vamos hoje\?/);
  assert.match(discover, /LocationSearchNudge/);
  assert.match(search, /LocationSearchNudge/);
  assert.doesNotMatch(context, /watchPosition/);
});
