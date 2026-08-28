import { readFile, writeFile } from "node:fs/promises";

const QUERY_GROUPS = [
  ...[
    "Savassi", "Lourdes", "Funcionários", "Santo Agostinho", "São Pedro", "Sion", "Anchieta",
    "Carmo", "Cruzeiro", "Serra", "Cidade Jardim", "Mangabeiras", "Belvedere", "São Bento",
    "Santa Tereza",
  ].map((neighborhood) => ({ kind: "restaurant", neighborhood, textQuery: `restaurantes em ${neighborhood}, Belo Horizonte, MG` })),
  ...[
    ["Padre Eustáquio", "bares"], ["Padre Eustáquio", "botecos"],
    ["Carlos Prates", "bares"], ["Carlos Prates", "botecos"],
    ["Castelo", "bares"], ["Castelo", "botecos"],
    ["Caiçara", "bares"], ["Caiçara", "botecos"],
  ].map(([neighborhood, category]) => ({ kind: "bar", neighborhood, textQuery: `${category} em ${neighborhood}, Belo Horizonte, MG` })),
];

const EXTRA_QUERIES = [
  { kind: "restaurant", neighborhood: "Savassi", textQuery: "Yakan Savassi Belo Horizonte MG", mandatory: "Yakan" },
  { kind: "bar", neighborhood: "Padre Eustáquio", textQuery: "Bola Bar Belo Horizonte MG", mandatory: "Bola Bar" },
  { kind: "bar", neighborhood: "Padre Eustáquio", textQuery: "Churrasquinho do Reginaldo Belo Horizonte MG", mandatory: "Churrasquinho do Reginaldo" },
  { kind: "bar", neighborhood: "Padre Eustáquio", textQuery: "Serrotinhos Belo Horizonte MG", mandatory: "Serrotinhos" },
];

const queries = [...QUERY_GROUPS, ...EXTRA_QUERIES];

function loadEnv(source) {
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function normalize(value = "") {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function slugify(value) {
  return normalize(value).replace(/\s+/g, "-");
}

function extractNeighborhood(place, expected) {
  const components = place.addressComponents ?? [];
  const candidate = components.find((component) => component.types?.some((type) => ["sublocality", "sublocality_level_1", "neighborhood"].includes(type)));
  return candidate?.longText ?? (normalize(place.formattedAddress).includes(normalize(expected)) ? expected : null);
}

function mapPrice(level) {
  return {
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  }[level] ?? null;
}

function mapCuisine(types = [], kind) {
  if (kind === "bar") {
    if (types.includes("brewery")) return ["Cervejaria"];
    if (types.includes("pub")) return ["Pub"];
    if (types.includes("wine_bar")) return ["Wine Bar"];
    if (types.includes("cocktail_bar")) return ["Coquetéis"];
    return ["Bar"];
  }
  const mapping = [
    ["japanese_restaurant", "Japonesa"], ["italian_restaurant", "Italiana"],
    ["brazilian_restaurant", "Brasileira"], ["pizza_restaurant", "Pizza"],
    ["barbecue_restaurant", "Churrasco"], ["steak_house", "Carnes"],
    ["hamburger_restaurant", "Hambúrguer"], ["arab_restaurant", "Árabe"],
    ["middle_eastern_restaurant", "Árabe"], ["mexican_restaurant", "Mexicana"],
    ["seafood_restaurant", "Frutos do Mar"], ["vegetarian_restaurant", "Vegetariana"],
    ["french_restaurant", "Francesa"], ["chinese_restaurant", "Chinesa"],
    ["indian_restaurant", "Indiana"], ["thai_restaurant", "Tailandesa"],
    ["korean_restaurant", "Coreana"], ["coffee_shop", "Café"],
  ];
  return mapping.filter(([type]) => types.includes(type)).map(([, cuisine]) => cuisine);
}

async function fetchCatalog(url, anonKey) {
  const response = await fetch(`${url}/rest/v1/restaurants?select=id,slug,name,address,city,neighborhood,latitude,longitude,category,cuisines,google_place_id,status&order=name.asc`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}`);
  return response.json();
}

async function search(apiKey, query) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.primaryType,places.types,places.businessStatus,places.priceLevel,places.photos,places.websiteUri,places.nationalPhoneNumber",
    },
    body: JSON.stringify({ textQuery: query.textQuery, languageCode: "pt-BR", regionCode: "BR", pageSize: 20 }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Google Places HTTP ${response.status}`);
  return response.json();
}

await loadEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!googleApiKey || !supabaseUrl || !anonKey) throw new Error("Variáveis locais obrigatórias não configuradas.");

const existing = await fetchCatalog(supabaseUrl, anonKey);
const existingPlaceIds = new Set(existing.flatMap((restaurant) => restaurant.google_place_id ? [restaurant.google_place_id] : []));
const existingNames = new Set(existing.map((restaurant) => normalize(restaurant.name)));
const candidates = new Map();
const queryErrors = [];
let calls = 0;

for (const query of queries) {
  try {
    const result = await search(googleApiKey, query);
    calls += 1;
    for (const place of result.places ?? []) {
      const name = place.displayName?.text?.trim();
      const neighborhood = extractNeighborhood(place, query.neighborhood);
      if (!name || !place.id || !place.location || !neighborhood) continue;
      const key = place.id;
      const current = candidates.get(key);
      const record = {
        name,
        normalizedName: normalize(name),
        proposedSlug: slugify(`${name}-${neighborhood}`),
        address: place.formattedAddress ?? "",
        city: "Belo Horizonte",
        neighborhood,
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        googlePlaceId: place.id,
        category: query.kind,
        cuisines: mapCuisine(place.types ?? [], query.kind),
        priceRange: mapPrice(place.priceLevel),
        businessStatus: place.businessStatus ?? "UNKNOWN",
        photoAvailable: Boolean(place.photos?.length),
        phone: place.nationalPhoneNumber ?? null,
        website: place.websiteUri ?? null,
        primaryType: place.primaryType ?? null,
        queries: [...new Set([...(current?.queries ?? []), query.textQuery])],
        mandatory: [...new Set([...(current?.mandatory ?? []), ...(query.mandatory ? [query.mandatory] : [])])],
      };
      candidates.set(key, record);
    }
  } catch (error) {
    queryErrors.push({ query: query.textQuery, error: error instanceof Error ? error.message : "Erro desconhecido" });
  }
}

const classified = [...candidates.values()].map((candidate) => {
  const existingByPlace = existingPlaceIds.has(candidate.googlePlaceId);
  const sameNameRows = existing.filter((restaurant) => normalize(restaurant.name) === candidate.normalizedName);
  const existingByName = sameNameRows.length > 0;
  const closed = candidate.businessStatus === "CLOSED_PERMANENTLY";
  const operational = candidate.businessStatus === "OPERATIONAL";
  const complete = Boolean(candidate.address && candidate.neighborhood && candidate.priceRange && candidate.cuisines.length);
  const sameLocation = sameNameRows.some((restaurant) => Math.abs(restaurant.latitude - candidate.latitude) < 0.001 && Math.abs(restaurant.longitude - candidate.longitude) < 0.001);
  const branchOfKnownName = existingByName && !sameLocation && !existingByPlace;
  const classification = closed ? "CLOSED" : existingByPlace || sameLocation ? "EXISTING" : operational && complete ? "NEW" : existingByName ? "POSSIBLE_DUPLICATE" : "MANUAL_REVIEW";
  return { ...candidate, classification, reason: classification === "NEW" ? (branchOfKnownName ? "verified-distinct-location" : "operational-complete") : classification === "EXISTING" ? "existing-place-or-name-location" : classification === "CLOSED" ? "closed-permanently" : classification === "POSSIBLE_DUPLICATE" ? "same-normalized-name-missing-required-data" : "missing-required-data-or-nonoperational" };
}).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

const result = {
  generatedAt: new Date().toISOString(),
  googlePlacesRequests: calls,
  queryErrors,
  existing: {
    count: existing.length,
    placeIds: existingPlaceIds.size,
    names: existing.map((restaurant) => ({ id: restaurant.id, slug: restaurant.slug, name: restaurant.name, neighborhood: restaurant.neighborhood, googlePlaceId: restaurant.google_place_id })),
  },
  candidates: classified,
};
const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0 && process.argv[outputIndex + 1]) {
  await writeFile(process.argv[outputIndex + 1], JSON.stringify(result, null, 2));
}
if (process.argv.includes("--summary")) {
  const byClassification = Object.groupBy(classified, (candidate) => candidate.classification);
  const byKind = Object.groupBy(classified, (candidate) => candidate.category);
  const mandatory = classified.filter((candidate) => candidate.mandatory.length);
  console.log(JSON.stringify({
    googlePlacesRequests: calls,
    queryErrors,
    existing: { count: existing.length, placeIds: existingPlaceIds.size },
    candidates: classified.length,
    classifications: Object.fromEntries(Object.entries(byClassification).map(([key, values]) => [key, values.length])),
    restaurantClassifications: Object.fromEntries(Object.entries(Object.groupBy(byKind.restaurant ?? [], (candidate) => candidate.classification)).map(([key, values]) => [key, values.length])),
    barClassifications: Object.fromEntries(Object.entries(Object.groupBy(byKind.bar ?? [], (candidate) => candidate.classification)).map(([key, values]) => [key, values.length])),
    mandatory,
  }, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}
