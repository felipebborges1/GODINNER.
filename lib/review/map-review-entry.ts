import type { RestaurantCoordinates } from "@/types";

type Region = { city: string; region?: string; country?: string };

export type MapReviewEntry = {
  query: string;
  manualRegion?: Region;
  devicePosition?: RestaurantCoordinates;
};

function clean(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

/** The first comma-delimited part is the only safe name suggestion. */
export function suggestedPlaceName(query: string) {
  return clean(query.split(",")[0]);
}

export function initialMapArea(entry: MapReviewEntry) {
  const parts = entry.query.split(",").map(clean).filter(Boolean);
  if (parts.length > 1) return parts.slice(1).join(", ");
  if (!entry.manualRegion) return "";
  return [entry.manualRegion.region || entry.manualRegion.city, entry.manualRegion.country].filter(Boolean).join(", ");
}

export function mapReviewUrl(entry: MapReviewEntry) {
  const params = new URLSearchParams({ manual: "1" });
  const name = suggestedPlaceName(entry.query);
  const area = initialMapArea(entry);
  if (name) params.set("name", name);
  if (area) params.set("area", area);
  if (!area && entry.devicePosition) {
    params.set("centerLat", String(entry.devicePosition.latitude));
    params.set("centerLng", String(entry.devicePosition.longitude));
  }
  return `/review/map?${params.toString()}`;
}
