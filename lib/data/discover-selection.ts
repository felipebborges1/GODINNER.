import type { Restaurant } from "@/types";

// Existing Production fallback: preserve input order, then take the first six.
export function selectDiscoverFallback(restaurants: Restaurant[]) {
  return restaurants.filter(restaurant => ["Vila da Serra", "Vale do Sereno"].includes(restaurant.neighborhood)).slice(0, 6);
}
