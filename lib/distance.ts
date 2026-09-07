import type { RestaurantCoordinates } from "@/types";

/** Test/mock fixture coordinates only; never used to calculate a user's distance. */
export function mockRestaurantCoordinates(index: number, city: string): RestaurantCoordinates {
  const base = city === "Nova Lima" ? { latitude: -19.9792, longitude: -43.9506 } : { latitude: -19.956, longitude: -43.946 };
  return { latitude: base.latitude + (index % 5) * 0.001, longitude: base.longitude - (index % 5) * 0.001 };
}


export function hasCoordinates(value: RestaurantCoordinates | null | undefined): value is RestaurantCoordinates {
  return Boolean(value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude));
}

export function distanceKm(a: RestaurantCoordinates, b: RestaurantCoordinates) {
  const earthRadiusKm = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude))
    * Math.cos(radians(b.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;

  return Number((2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))).toFixed(1));
}
