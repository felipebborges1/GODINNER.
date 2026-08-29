import "server-only";

import { parseRestaurantAddress, type GoogleAddressComponent } from "@/lib/restaurant-location";
import type { RestaurantCoordinates } from "@/types";
import type { GooglePlaceCandidate } from "@/lib/google-place-types";

type GooglePlaceApiAddressComponent = GoogleAddressComponent;

type GooglePlaceApiPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: GooglePlaceApiAddressComponent[];
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  types?: string[];
};

export type { GooglePlaceCandidate } from "@/lib/google-place-types";

type SearchOptions = { position?: RestaurantCoordinates };

function apiKey() {
  const value = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!value) throw new Error("Google Places indisponível neste ambiente.");
  return value;
}

function toCandidate(place: GooglePlaceApiPlace): GooglePlaceCandidate | null {
  const placeId = place.id?.trim();
  const name = place.displayName?.text?.trim();
  if (!placeId || !name) return null;
  const location = place.location;
  const coordinates = Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)
    ? { latitude: Number(location?.latitude), longitude: Number(location?.longitude) }
    : undefined;
  const address = parseRestaurantAddress({
    formatted_address: place.formattedAddress ?? "",
    address_components: place.addressComponents,
  });

  return {
    placeId,
    name,
    address: address.address,
    city: address.city,
    neighborhood: address.neighborhood,
    region: address.region,
    country: address.country,
    coordinates,
    primaryType: place.primaryType,
    types: place.types ?? [],
  };
}

async function requestGooglePlaces(path: string, body?: Record<string, unknown>) {
  const fieldMask = body
    ? "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.primaryType,places.types"
    : "id,displayName,formattedAddress,addressComponents,location,primaryType,types";
  const response = await fetch(`https://places.googleapis.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": fieldMask,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(7_000),
  });
  if (!response.ok) throw new Error(`Google Places retornou HTTP ${response.status}.`);
  return response.json() as Promise<{ places?: GooglePlaceApiPlace[] } & GooglePlaceApiPlace>;
}

export async function searchGooglePlaces(query: string, options: SearchOptions = {}) {
  const textQuery = query.trim().slice(0, 120);
  if (textQuery.length < 2) return [];
  const locationBias = options.position ? {
    circle: { center: options.position, radius: 30_000 },
  } : undefined;
  const response = await requestGooglePlaces("places:searchText", {
    textQuery,
    languageCode: "pt-BR",
    maxResultCount: 6,
    ...(locationBias ? { locationBias } : {}),
  });
  return (response.places ?? []).map(toCandidate).filter((place): place is GooglePlaceCandidate => Boolean(place));
}

export async function searchGooglePlacesNearby(position: RestaurantCoordinates) {
  const response = await requestGooglePlaces("places:searchNearby", {
    includedTypes: ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"],
    maxResultCount: 10,
    rankPreference: "DISTANCE",
    locationRestriction: { circle: { center: position, radius: 700 } },
    languageCode: "pt-BR",
  });
  return (response.places ?? []).map(toCandidate).filter((place): place is GooglePlaceCandidate => Boolean(place));
}

export async function getGooglePlaceDetails(placeId: string) {
  const safePlaceId = placeId.trim();
  if (!safePlaceId || safePlaceId.length > 200) throw new Error("Local inválido.");
  const place = await requestGooglePlaces(`places/${encodeURIComponent(safePlaceId)}?languageCode=pt-BR`);
  const candidate = toCandidate(place);
  if (!candidate || !candidate.coordinates || !candidate.address) {
    throw new Error("Não conseguimos confirmar todos os dados deste local.");
  }
  return candidate;
}

export function mapGooglePlaceType(place: Pick<GooglePlaceCandidate, "primaryType" | "types">) {
  const allTypes = [place.primaryType, ...place.types].filter(Boolean);
  const has = (...types: string[]) => types.some((type) => allTypes.includes(type));
  if (has("bar", "wine_bar", "cocktail_bar")) return { category: "bar" as const, cuisine: ["Bar"] };
  if (has("cafe", "coffee_shop")) return { category: "restaurant" as const, cuisine: ["Café"] };
  if (has("japanese_restaurant", "sushi_restaurant")) return { category: "restaurant" as const, cuisine: ["Japonesa"] };
  if (has("italian_restaurant", "pizza_restaurant")) return { category: "restaurant" as const, cuisine: ["Italiana"] };
  if (has("brazilian_restaurant")) return { category: "restaurant" as const, cuisine: ["Brasileira"] };
  if (has("mexican_restaurant")) return { category: "restaurant" as const, cuisine: ["Mexicana"] };
  if (has("chinese_restaurant")) return { category: "restaurant" as const, cuisine: ["Chinesa"] };
  if (has("indian_restaurant")) return { category: "restaurant" as const, cuisine: ["Indiana"] };
  if (has("french_restaurant")) return { category: "restaurant" as const, cuisine: ["Francesa"] };
  if (has("steak_house", "barbecue_restaurant")) return { category: "restaurant" as const, cuisine: ["Carnes"] };
  return { category: "restaurant" as const, cuisine: ["Não informada"] };
}
