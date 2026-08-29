import type { RestaurantCoordinates } from "@/types";

/** Coordenada simulada usada apenas quando o navegador não fornece localização. */
export const FALLBACK_COORDINATES: RestaurantCoordinates = {
  latitude: -19.9792,
  longitude: -43.9506,
};

const NOVA_LIMA_COORDINATES: RestaurantCoordinates[] = [
  { latitude: -19.9792, longitude: -43.9506 },
  { latitude: -19.9758, longitude: -43.9561 },
  { latitude: -19.9824, longitude: -43.9448 },
  { latitude: -19.9719, longitude: -43.9502 },
  { latitude: -19.9851, longitude: -43.9473 },
  { latitude: -19.9771, longitude: -43.9418 },
  { latitude: -19.9883, longitude: -43.9542 },
  { latitude: -19.9688, longitude: -43.9584 },
  { latitude: -19.9815, longitude: -43.9617 },
  { latitude: -19.9737, longitude: -43.9462 },
];

const BELO_HORIZONTE_COORDINATES: RestaurantCoordinates[] = [
  { latitude: -19.9675, longitude: -43.9508 },
  { latitude: -19.9628, longitude: -43.9441 },
  { latitude: -19.9734, longitude: -43.9397 },
  { latitude: -19.9589, longitude: -43.9553 },
  { latitude: -19.9781, longitude: -43.9435 },
  { latitude: -19.9651, longitude: -43.9631 },
  { latitude: -19.9712, longitude: -43.9572 },
  { latitude: -19.9547, longitude: -43.9485 },
  { latitude: -19.9817, longitude: -43.9519 },
  { latitude: -19.9604, longitude: -43.9602 },
];

export function mockRestaurantCoordinates(index: number, city: string) {
  const source = city === "Nova Lima" ? NOVA_LIMA_COORDINATES : BELO_HORIZONTE_COORDINATES;
  return source[index % source.length];
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
