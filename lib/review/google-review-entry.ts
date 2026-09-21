import type { GooglePlaceCandidate } from "@/lib/google-place-types";

/** Opens confirmation without creating a restaurant. Shared by Home and review entry. */
export function reviewNewUrl(place: GooglePlaceCandidate) {
  const query = new URLSearchParams({ placeId: place.placeId, name: place.name, address: place.address });
  if (place.city) query.set("city", place.city);
  if (place.neighborhood) query.set("neighborhood", place.neighborhood);
  if (place.country) query.set("country", place.country);
  if (place.coordinates) {
    query.set("latitude", String(place.coordinates.latitude));
    query.set("longitude", String(place.coordinates.longitude));
  }
  return `/restaurant/new?${query.toString()}`;
}
