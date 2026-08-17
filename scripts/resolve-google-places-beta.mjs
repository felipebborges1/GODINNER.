import { readFile } from "node:fs/promises";

const approvedPlaceIds = new Map([
  ["glouton", "ChIJFeUR4WGXpgARXjcWkFaBptY"],
  ["ninita", "ChIJ-f63dbCXpgARBgk6hif7cgE"],
]);

function loadEnv(source) {
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const ignoredTokens = new Set([
  "a", "as", "av", "avenida", "bar", "belo", "bh", "brasil", "da", "das", "de", "do", "dos",
  "e", "loja", "ltda", "mg", "nova", "numero", "restaurante", "rodovia", "rua", "shopping",
]);

function tokens(value) {
  return new Set(normalize(value).split(" ").filter((token) => token.length > 1 && !ignoredTokens.has(token)));
}

function overlap(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter((token) => b.has(token)).length;
  return shared / Math.max(a.size, b.size);
}

function nameCompatibility(expected, actual) {
  const left = normalize(expected);
  const right = normalize(actual);
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.9;
  return overlap(expected, actual);
}

function distanceKm(a, b) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function scoreCandidate(restaurant, place) {
  const coordinates = place.location;
  const distance = coordinates ? distanceKm(restaurant, coordinates) : Number.POSITIVE_INFINITY;
  const nameScore = nameCompatibility(restaurant.name, place.displayName?.text ?? "");
  const addressScore = overlap(`${restaurant.address} ${restaurant.neighborhood}`, place.formattedAddress ?? "");
  const distanceScore = distance <= 0.25 ? 1 : distance <= 0.75 ? 0.85 : distance <= 2 ? 0.65 : distance <= 5 ? 0.25 : 0;
  return {
    place,
    distance,
    nameScore,
    addressScore,
    score: nameScore * 0.55 + addressScore * 0.25 + distanceScore * 0.2,
  };
}

async function fetchRestaurants(url, anonKey) {
  const response = await fetch(`${url}/rest/v1/restaurants?select=id,slug,name,address,city,neighborhood,latitude,longitude&status=eq.published&order=name.asc`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Supabase retornou HTTP ${response.status}.`);
  const rows = await response.json();
  return rows.filter((row) => row.id.startsWith("30000000-0000-4000-8000-"));
}

async function searchPlace(apiKey, restaurant) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.photos",
    },
    body: JSON.stringify({
      textQuery: `${restaurant.name}, ${restaurant.address}`,
      languageCode: "pt-BR",
      regionCode: "BR",
      pageSize: 3,
      locationBias: {
        circle: {
          center: { latitude: restaurant.latitude, longitude: restaurant.longitude },
          radius: 2_500,
        },
      },
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Google Places retornou HTTP ${response.status}.`);
  return response.json();
}

await loadEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
const apiKey = process.env.GOOGLE_PLACES_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!apiKey || !supabaseUrl || !anonKey) throw new Error("Variáveis locais obrigatórias não configuradas.");

const restaurants = await fetchRestaurants(supabaseUrl, anonKey);
if (restaurants.length !== 30) throw new Error(`Esperados 30 restaurantes Beta; encontrados ${restaurants.length}.`);

const results = [];
let calls = 0;
for (const restaurant of restaurants) {
  const approvedPlaceId = approvedPlaceIds.get(restaurant.slug);
  if (approvedPlaceId) {
    results.push({
      slug: restaurant.slug,
      name: restaurant.name,
      status: "PASS",
      placeId: approvedPlaceId,
      photoAvailable: true,
      source: "approved-poc",
    });
    continue;
  }

  try {
    const payload = await searchPlace(apiKey, restaurant);
    calls += 1;
    const ranked = (payload.places ?? [])
      .map((place) => scoreCandidate(restaurant, place))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1];
    const confident = Boolean(
      best &&
      best.nameScore >= 0.58 &&
      best.distance <= 3 &&
      best.score >= 0.58 &&
      (!second || best.score - second.score >= 0.08 || best.nameScore >= 0.9),
    );

    results.push({
      slug: restaurant.slug,
      name: restaurant.name,
      status: confident ? "PASS" : "PLACE_MATCH_PENDING",
      placeId: confident ? best.place.id : null,
      photoAvailable: confident ? Boolean(best.place.photos?.length) : false,
      matchName: best?.place.displayName?.text ?? null,
      matchAddress: best?.place.formattedAddress ?? null,
      distanceKm: best ? Number(best.distance.toFixed(3)) : null,
      score: best ? Number(best.score.toFixed(3)) : null,
      candidates: ranked.map(({ place, distance, score }) => ({
        placeId: place.id,
        name: place.displayName?.text ?? "",
        address: place.formattedAddress ?? "",
        distanceKm: Number(distance.toFixed(3)),
        score: Number(score.toFixed(3)),
        photoAvailable: Boolean(place.photos?.length),
      })),
    });
  } catch (error) {
    results.push({
      slug: restaurant.slug,
      name: restaurant.name,
      status: "ERROR",
      placeId: null,
      photoAvailable: false,
      error: error instanceof Error ? error.message : "Erro desconhecido.",
    });
  }
}

console.log(JSON.stringify({ calls, restaurants: results }, null, 2));
