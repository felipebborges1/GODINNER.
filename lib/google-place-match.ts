import { distanceKm } from "@/lib/distance";
import type { GooglePlaceCandidate } from "@/lib/google-place-types";

type RestaurantIdentity = { name: string; address: string; city: string; latitude: number | null; longitude: number | null };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
const nameKey = (text: string) => normalize(text).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const genericNames = new Set(["o", "a", "do", "da", "de", "bar", "restaurante", "restaurant", "cafe", "sushi", "pizzaria", "ristorante", "italiano"]);

export function matchGoogleRestaurant(restaurant: RestaurantIdentity, candidates: GooglePlaceCandidate[]) {
  const name = nameKey(restaurant.name);
  const address = normalize(restaurant.address);
  const city = normalize(restaurant.city);
  const distinctive = name.split(" ").some(token => !genericNames.has(token) && token.length >= 3);
  const matches = candidates.filter(candidate => {
    if (!name || !candidate.placeId) return false;
    const candidateCity = normalize(candidate.city ?? "");
    if (city && candidateCity && city !== candidateCity) return false;
    const sameAddress = Boolean(address && normalize(candidate.address) === address);
    const candidateName = nameKey(candidate.name);
    const sameName = candidateName === name;
    const closeEnough = candidate.coordinates && restaurant.latitude !== null && restaurant.longitude !== null
      && Number.isFinite(restaurant.latitude) && Number.isFinite(restaurant.longitude)
      && distanceKm(candidate.coordinates, { latitude: restaurant.latitude, longitude: restaurant.longitude }) <= 0.1;
    // A longer Google trading name is safe only with the complete, identical
    // address and city. Proximity alone never authorizes a partial-name match.
    const extendedName = distinctive && candidateName.startsWith(`${name} `)
      && sameAddress && Boolean(city) && candidateCity === city;
    return (sameName && (sameAddress || closeEnough)) || extendedName;
  });
  const unique = [...new Map(matches.map(candidate => [candidate.placeId, candidate])).values()];
  if (unique.length === 1) return { status: "matched" as const, candidate: unique[0] };
  return { status: unique.length > 1 ? "ambiguous" as const : "unmatched" as const, candidate: null };
}
