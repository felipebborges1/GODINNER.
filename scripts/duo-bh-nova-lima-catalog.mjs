import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DUO_CITIES = ["belo-horizonte", "nova-lima"];
const IN_SCOPE_CITIES = new Set(["belo horizonte", "nova lima"]);
const GOOGLE_FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.primaryType,places.types,places.businessStatus";

function loadEnv(source) {
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^[\"']|[\"']$/g, "");
  }
}

function decodeHtml(value = "") {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#039;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, " ");
}

function normalize(value = "") {
  return decodeHtml(value).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function slugify(value) {
  return normalize(value).replace(/\s+/g, "-").slice(0, 96);
}

function cityFromComponents(components = []) {
  const city = components.find((component) => component.types?.includes("administrative_area_level_2"))
    ?? components.find((component) => component.types?.includes("locality"));
  return city?.longText ?? "";
}

function neighborhoodFromComponents(components = []) {
  const neighborhood = components.find((component) => component.types?.some((type) => ["sublocality", "sublocality_level_1", "neighborhood"].includes(type)));
  return neighborhood?.longText ?? "";
}

function countryFromComponents(components = []) {
  return components.find((component) => component.types?.includes("country"))?.shortText ?? "";
}

function tokenOverlap(left, right) {
  const ignored = new Set(["a", "as", "av", "avenida", "bar", "bh", "belo", "da", "das", "de", "do", "dos", "e", "em", "horizonte", "mg", "nova", "restaurante", "rua"]);
  const a = new Set(normalize(left).split(" ").filter((token) => token.length > 1 && !ignored.has(token)));
  const b = new Set(normalize(right).split(" ").filter((token) => token.length > 1 && !ignored.has(token)));
  if (!a.size || !b.size) return 0;
  return [...a].filter((token) => b.has(token)).length / Math.max(a.size, b.size);
}

function nameScore(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  return tokenOverlap(left, right);
}

function sameNeighborhood(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
}

function distanceKm(left, right) {
  if (!left?.latitude || !left?.longitude || !right?.latitude || !right?.longitude) return Number.POSITIVE_INFINITY;
  const radians = (value) => value * Math.PI / 180;
  const dLat = radians(right.latitude - left.latitude);
  const dLng = radians(right.longitude - left.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(left.latitude)) * Math.cos(radians(right.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapCategory(types = [], duoCuisine = "") {
  const allTypes = new Set(types);
  if (["bar", "wine_bar", "cocktail_bar", "pub", "brewery"].some((type) => allTypes.has(type)) || /bar|pub|cervejaria|gastrobar/i.test(duoCuisine)) return "bar";
  return "restaurant";
}

function mapCuisines(types = [], duoCuisine = "") {
  const mapping = [
    ["japanese_restaurant", "Japonesa"], ["sushi_restaurant", "Japonesa"], ["italian_restaurant", "Italiana"],
    ["pizza_restaurant", "Italiana"], ["brazilian_restaurant", "Brasileira"], ["mexican_restaurant", "Mexicana"],
    ["chinese_restaurant", "Chinesa"], ["indian_restaurant", "Indiana"], ["french_restaurant", "Francesa"],
    ["steak_house", "Carnes"], ["barbecue_restaurant", "Carnes"], ["seafood_restaurant", "Frutos do Mar"],
    ["coffee_shop", "Café"], ["vegetarian_restaurant", "Vegetariana"],
  ];
  const mapped = mapping.filter(([type]) => types.includes(type)).map(([, cuisine]) => cuisine);
  if (mapped.length) return [...new Set(mapped)];
  const allowedDuo = new Map([
    ["japonesa", "Japonesa"], ["italiana", "Italiana"], ["brasileira", "Brasileira"], ["mexicana", "Mexicana"],
    ["indiana", "Indiana"], ["frutos do mar", "Frutos do Mar"], ["cafeteria", "Café"], ["vegetariana", "Vegetariana"],
  ]);
  return allowedDuo.has(normalize(duoCuisine)) ? [allowedDuo.get(normalize(duoCuisine))] : [];
}

export function parseDuoPartners(html, requestedCity) {
  const cards = [...html.matchAll(/restaurant-card[\s\S]*?data-name="([^"]+)"[\s\S]*?data-culinary="([^"]*)"[\s\S]*?data-district="([^"]*)"[\s\S]*?<a href="([^"]+)"/g)];
  return cards
    .map((match) => ({ name: decodeHtml(match[1]).trim(), cuisine: decodeHtml(match[2]).trim(), neighborhood: decodeHtml(match[3]).trim(), duoUrl: `https://www.duogourmet.com.br${match[4]}`, duoCity: match[4].split("/")[2] ?? "" }))
    .filter((partner) => partner.duoCity === requestedCity)
    .filter((partner, index, all) => all.findIndex((other) => other.duoUrl === partner.duoUrl) === index);
}

async function fetchDuoPartners() {
  const responses = await Promise.all(DUO_CITIES.map(async (city) => {
    const response = await fetch(`https://www.duogourmet.com.br/restaurantes/${city}`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Duo Gourmet HTTP ${response.status} para ${city}.`);
    return parseDuoPartners(await response.text(), city);
  }));
  return responses.flat();
}

async function fetchCatalog(supabaseUrl, key) {
  const response = await fetch(`${supabaseUrl}/rest/v1/restaurants?select=id,slug,name,address,city,neighborhood,latitude,longitude,category,cuisines,google_place_id,status&status=eq.published&order=name.asc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status} ao consultar o catálogo.`);
  return response.json();
}

async function searchGoogle(apiKey, partner) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": GOOGLE_FIELD_MASK },
    body: JSON.stringify({ textQuery: `${partner.name}, ${partner.neighborhood}, ${partner.duoCity === "nova-lima" ? "Nova Lima" : "Belo Horizonte"}, MG`, languageCode: "pt-BR", regionCode: "BR", pageSize: 4 }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Google Places HTTP ${response.status}.`);
  return response.json();
}

function toGooglePlace(place) {
  if (!place?.id || !place?.displayName?.text || !place?.location) return null;
  const components = place.addressComponents ?? [];
  return {
    id: place.id,
    name: place.displayName.text.trim(),
    address: place.formattedAddress ?? "",
    city: cityFromComponents(components),
    neighborhood: neighborhoodFromComponents(components),
    countryCode: countryFromComponents(components),
    latitude: place.location.latitude,
    longitude: place.location.longitude,
    primaryType: place.primaryType ?? null,
    types: place.types ?? [],
    businessStatus: place.businessStatus ?? "UNKNOWN",
  };
}

function rankGoogleCandidate(partner, place) {
  const cityOk = IN_SCOPE_CITIES.has(normalize(place.city));
  const name = nameScore(partner.name, place.name);
  const neighborhoodOk = sameNeighborhood(partner.neighborhood, place.neighborhood) || normalize(place.address).includes(normalize(partner.neighborhood));
  const score = name * 0.75 + (cityOk ? 0.15 : 0) + (neighborhoodOk ? 0.10 : 0);
  return { ...place, cityOk, neighborhoodOk, nameScore: Number(name.toFixed(3)), score: Number(score.toFixed(3)) };
}

function secondaryExistingMatch(partner, googlePlace, existing) {
  const candidates = existing.map((restaurant) => ({
    restaurant,
    nameScore: nameScore(restaurant.name, googlePlace.name),
    cityOk: normalize(restaurant.city) === normalize(googlePlace.city),
    neighborhoodOk: sameNeighborhood(restaurant.neighborhood, googlePlace.neighborhood),
    distance: distanceKm(restaurant, googlePlace),
  })).filter((candidate) => candidate.cityOk);
  const best = candidates.sort((left, right) => (right.nameScore + (right.neighborhoodOk ? 0.1 : 0)) - (left.nameScore + (left.neighborhoodOk ? 0.1 : 0)))[0];
  if (!best || best.nameScore < 0.9 || (!best.neighborhoodOk && best.distance > 0.2)) return null;
  return { id: best.restaurant.id, slug: best.restaurant.slug, distanceKm: Number(best.distance.toFixed(3)), nameScore: Number(best.nameScore.toFixed(3)) };
}

function classifyPartner(partner, googlePlaces, existingByPlace, existing) {
  const ranked = googlePlaces.map((place) => rankGoogleCandidate(partner, place)).sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const second = ranked[1];
  if (!best) return { ...partner, decision: "NO_MATCH", confidence: "NO_MATCH", reason: "google-empty", google: null, candidates: [] };
  if (!best.cityOk) return { ...partner, decision: "OUTSIDE_SCOPE", confidence: "LOW", reason: "google-city-outside-bh-nova-lima", google: best, candidates: ranked };
  if (best.businessStatus === "CLOSED_PERMANENTLY") return { ...partner, decision: "CLOSED_GOOGLE", confidence: "HIGH", reason: "google-permanently-closed", google: best, candidates: ranked };
  const existingRestaurant = existingByPlace.get(best.id);
  if (existingRestaurant) return { ...partner, decision: "EXISTING_PLACE_ID", confidence: "HIGH", reason: "same-google-place-id", google: best, godinner: { id: existingRestaurant.id, slug: existingRestaurant.slug }, candidates: ranked };
  const unambiguous = !second || best.score - second.score >= 0.08 || best.nameScore === 1;
  const high = best.nameScore >= 0.9 && best.neighborhoodOk && best.countryCode === "BR" && best.businessStatus !== "CLOSED_PERMANENTLY" && unambiguous;
  if (high) {
    const secondary = secondaryExistingMatch(partner, best, existing);
    if (secondary) return { ...partner, decision: "EXISTING_SECONDARY_HIGH", confidence: "HIGH", reason: "same-name-and-location-existing-catalog", google: best, godinner: secondary, candidates: ranked };
    return { ...partner, decision: "NEW_HIGH", confidence: "HIGH", reason: "name-city-neighborhood-google-match", google: best, candidates: ranked };
  }
  const medium = best.nameScore >= 0.7 && best.countryCode === "BR";
  return { ...partner, decision: medium ? "MEDIUM" : "LOW", confidence: medium ? "MEDIUM" : "LOW", reason: medium ? "probable-google-match-needs-review" : "insufficient-name-or-location-confidence", google: best, candidates: ranked };
}

function countBy(rows, selector) {
  return Object.fromEntries(Object.entries(Object.groupBy(rows, selector)).map(([key, values]) => [key, values.length]));
}

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function runAudit({ outputPath }) {
  await loadEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!apiKey || !supabaseUrl || !anonKey) throw new Error("Variáveis locais obrigatórias não configuradas.");
  const [partners, existing] = await Promise.all([fetchDuoPartners(), fetchCatalog(supabaseUrl, anonKey)]);
  const existingByPlace = new Map(existing.flatMap((restaurant) => restaurant.google_place_id ? [[restaurant.google_place_id, restaurant]] : []));
  const results = [];
  const errors = [];
  let googleSearches = 0;
  for (const partner of partners) {
    try {
      const payload = await searchGoogle(apiKey, partner);
      googleSearches += 1;
      const places = (payload.places ?? []).map(toGooglePlace).filter(Boolean);
      results.push(classifyPartner(partner, places, existingByPlace, existing));
    } catch (error) {
      errors.push({ partner: partner.name, error: error instanceof Error ? error.message : "Erro desconhecido" });
      results.push({ ...partner, decision: "NO_MATCH", confidence: "NO_MATCH", reason: "google-temporary-error", google: null, candidates: [] });
    }
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  const audit = {
    generatedAt: new Date().toISOString(), source: "https://www.duogourmet.com.br/restaurantes/belo-horizonte + /nova-lima", googleSearches, placeDetails: 0,
    duo: { total: partners.length, byCity: countBy(partners, (partner) => partner.duoCity), byNeighborhood: countBy(partners, (partner) => `${partner.duoCity}:${partner.neighborhood}`), byCuisine: countBy(partners, (partner) => partner.cuisine) },
    catalogBefore: { published: existing.length, byCity: countBy(existing, (restaurant) => restaurant.city), byNeighborhood: countBy(existing, (restaurant) => `${restaurant.city}:${restaurant.neighborhood}`) },
    summary: countBy(results, (result) => result.decision), errors, results,
  };
  if (outputPath) await saveJson(outputPath, audit);
  console.log(JSON.stringify({ source: audit.source, duo: audit.duo, catalogBefore: audit.catalogBefore, summary: audit.summary, googleSearches, errors: errors.length, outputPath }, null, 2));
  return audit;
}

async function applyImport(auditPath, outputPath) {
  await loadEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Variáveis locais obrigatórias não configuradas.");
  const audit = JSON.parse(await readFile(auditPath, "utf8"));
  const existing = await fetchCatalog(supabaseUrl, serviceRoleKey);
  const byId = new Map(existing.map((restaurant) => [restaurant.id, restaurant]));
  const byPlace = new Map(existing.flatMap((restaurant) => restaurant.google_place_id ? [[restaurant.google_place_id, restaurant]] : []));
  const checkedAt = new Date().toISOString();
  const enrich = audit.results.filter((result) => ["EXISTING_PLACE_ID", "EXISTING_SECONDARY_HIGH"].includes(result.decision));
  const newHigh = audit.results.filter((result) => result.decision === "NEW_HIGH");
  const slugs = new Set(existing.map((restaurant) => restaurant.slug));
  const insertRows = [];
  const skipped = [];
  for (const result of newHigh) {
    if (byPlace.has(result.google.id)) continue;
    const slug = slugify(`${result.google.name}-${result.google.neighborhood || result.neighborhood}`);
    if (!slug || slugs.has(slug)) { skipped.push({ name: result.name, reason: "slug-conflict" }); continue; }
    slugs.add(slug);
    insertRows.push({
      slug, name: result.google.name, address: result.google.address, city: result.google.city, neighborhood: result.google.neighborhood || result.neighborhood,
      country_code: "BR", latitude: result.google.latitude, longitude: result.google.longitude,
      category: mapCategory(result.google.types, result.cuisine), cuisines: mapCuisines(result.google.types, result.cuisine),
      price_range: null, chef: "", google_place_id: result.google.id, accepts_duo_gourmet: true, duo_gourmet_checked_at: checkedAt, status: "published",
    });
  }
  const updates = [];
  for (const result of enrich) {
    const target = byId.get(result.godinner.id) ?? byPlace.get(result.google.id);
    if (!target) { skipped.push({ name: result.name, reason: "catalog-changed" }); continue; }
    const body = { accepts_duo_gourmet: true, duo_gourmet_checked_at: checkedAt, ...(target.google_place_id ? {} : { google_place_id: result.google.id }) };
    const response = await fetch(`${supabaseUrl}/rest/v1/restaurants?id=eq.${target.id}`, { method: "PATCH", headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Supabase HTTP ${response.status} ao enriquecer ${target.slug}.`);
    updates.push(...await response.json());
  }
  let inserted = [];
  if (insertRows.length) {
    const response = await fetch(`${supabaseUrl}/rest/v1/restaurants`, { method: "POST", headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(insertRows), signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Supabase HTTP ${response.status} ao inserir parceiros Duo. Confirme que price_range aceita NULL antes de aplicar.`);
    inserted = await response.json();
    if (inserted.length !== insertRows.length) throw new Error(`Inserção incompleta: ${inserted.length}/${insertRows.length}.`);
  }
  const after = await fetchCatalog(supabaseUrl, serviceRoleKey);
  const report = { appliedAt: checkedAt, auditPath, enriched: updates.map((row) => ({ id: row.id, slug: row.slug, googlePlaceId: row.google_place_id })), inserted: inserted.map((row) => ({ id: row.id, slug: row.slug, googlePlaceId: row.google_place_id })), skipped, catalogAfter: { published: after.length, byCity: countBy(after, (restaurant) => restaurant.city), byNeighborhood: countBy(after, (restaurant) => `${restaurant.city}:${restaurant.neighborhood}`) } };
  if (outputPath) await saveJson(outputPath, report);
  console.log(JSON.stringify({ enriched: report.enriched.length, inserted: report.inserted.length, skipped: report.skipped.length, catalogAfter: report.catalogAfter, outputPath }, null, 2));
}

async function validateImport(importPath) {
  await loadEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Variáveis locais obrigatórias não configuradas.");
  const imported = JSON.parse(await readFile(importPath, "utf8"));
  const audit = JSON.parse(await readFile(imported.auditPath, "utf8"));
  const ids = new Set(imported.inserted.map((restaurant) => restaurant.id));
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  const [restaurantsResponse, reviewsResponse] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/restaurants?select=id,slug,city,neighborhood,price_range,accepts_duo_gourmet,duo_gourmet_checked_at,cover_photo_url,cover_photo_path,google_place_id,status`, { headers, signal: AbortSignal.timeout(15_000) }),
    fetch(`${supabaseUrl}/rest/v1/reviews?select=restaurant_id`, { headers, signal: AbortSignal.timeout(15_000) }),
  ]);
  if (!restaurantsResponse.ok || !reviewsResponse.ok) throw new Error("Não foi possível validar a carga DG3.");
  const catalog = await restaurantsResponse.json();
  const created = catalog.filter((restaurant) => ids.has(restaurant.id));
  const reviews = await reviewsResponse.json();
  const sourceNeighborhoods = new Map();
  for (const partner of audit.results) sourceNeighborhoods.set(`${normalize(partner.duoCity)}:${normalize(partner.neighborhood)}`, partner);
  const catalogNeighborhoods = new Set(catalog.filter((restaurant) => IN_SCOPE_CITIES.has(normalize(restaurant.city))).map((restaurant) => `${normalize(restaurant.city)}:${normalize(restaurant.neighborhood)}`));
  const sourceNeighborhoodsMissingAfter = [...sourceNeighborhoods.entries()]
    .filter(([key]) => !catalogNeighborhoods.has(key))
    .map(([, partner]) => `${partner.duoCity}:${partner.neighborhood}`);
  const summary = {
    importedRows: created.length,
    allPublished: created.every((restaurant) => restaurant.status === "published"),
    allDuoTrue: created.every((restaurant) => restaurant.accepts_duo_gourmet === true),
    allChecked: created.every((restaurant) => Boolean(restaurant.duo_gourmet_checked_at)),
    allGoogleIds: created.every((restaurant) => Boolean(restaurant.google_place_id)),
    unknownPrice: created.filter((restaurant) => restaurant.price_range === null).length,
    storedPhotoFields: created.filter((restaurant) => restaurant.cover_photo_url || restaurant.cover_photo_path).length,
    reviewsOnCreated: reviews.filter((review) => ids.has(review.restaurant_id)).length,
    publishedByCity: countBy(catalog.filter((restaurant) => restaurant.status === "published"), (restaurant) => restaurant.city),
    sourceNeighborhoodsMissingAfter,
    sample: created.slice(0, 3),
  };
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2] ?? "audit";
  const arg = process.argv[3];
  if (command === "audit") {
    await runAudit({ outputPath: arg ? resolve(arg) : null });
  } else if (command === "apply") {
    if (!arg) throw new Error("Informe o caminho do arquivo de auditoria para aplicar.");
    await applyImport(resolve(arg), process.argv[4] ? resolve(process.argv[4]) : null);
  } else if (command === "validate") {
    if (!arg) throw new Error("Informe o caminho do relatório de importação para validar.");
    await validateImport(resolve(arg));
  } else {
    throw new Error("Uso: node scripts/duo-bh-nova-lima-catalog.mjs audit [arquivo] | apply <auditoria> [relatorio] | validate <relatorio>");
  }
}
