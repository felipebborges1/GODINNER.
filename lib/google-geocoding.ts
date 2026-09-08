import "server-only";

import { parseRestaurantAddress, type GoogleAddressComponent } from "@/lib/restaurant-location";

type GeocodingResult = { formatted_address?: string; address_components?: GoogleAddressComponent[] };
type GeocodingResponse = { status?: string; results?: GeocodingResult[] };

export type ResolvedDeviceRegion = { city: string; region?: string; country?: string; countryCode: string };

function apiKey() {
  const value = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!value) throw new Error("Google Maps indisponível neste ambiente.");
  return value;
}

/** Coordinates are used only for this request and are never persisted by GODINNER. */
export async function resolveDeviceRegion(latitude: number, longitude: number): Promise<ResolvedDeviceRegion | null> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  const parameters = new URLSearchParams({ latlng: `${latitude},${longitude}`, key: apiKey(), language: "pt-BR" });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${parameters}`, { cache: "no-store", signal: AbortSignal.timeout(7_000) });
  if (!response.ok) throw new Error(`Google Geocoding retornou HTTP ${response.status}.`);
  const payload = await response.json() as GeocodingResponse;
  if (payload.status !== "OK" || !payload.results?.[0]) return null;
  const address = parseRestaurantAddress({ formatted_address: payload.results[0].formatted_address ?? "", address_components: payload.results[0].address_components });
  if (!address.city || !address.countryCode) return null;
  return { city: address.city, ...(address.region ? { region: address.region } : {}), ...(address.country ? { country: address.country } : {}), countryCode: address.countryCode };
}
