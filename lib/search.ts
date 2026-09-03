import { calculateCommunitySpend } from "@/lib/community-spend";
import { normalizeRatingFilter } from "@/lib/review-rating";
import type { Restaurant, RestaurantList, Review } from "@/types";

export type SearchParams = Record<string, string>;

export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

export function filterRestaurants(
  restaurants: Restaurant[],
  params: SearchParams,
  lists: RestaurantList[],
  userId: string | null,
  reviews: Review[] = [],
) {
  const q = normalize(params.q ?? "");
  const normalizedRating = normalizeRatingFilter(params.rating);
  const duo = params.duo === "true" || params.duo === "false" ? params.duo : undefined;
  const history = params.history;
  const ids = history
    ? new Set(lists.find((list) => list.ownerId === userId && list.type === history)?.restaurantIds ?? [])
    : null;

  const result = restaurants.filter((restaurant) => {
    const text = normalize([
      restaurant.name,
      ...restaurant.cuisine,
      restaurant.neighborhood,
      restaurant.chef,
      restaurant.category,
    ].join(" "));

    return (
      (!q || text.includes(q)) &&
      (!params.city || normalize(restaurant.city).replace(" ", "-") === params.city) &&
      (!params.neighborhood || normalize(restaurant.neighborhood).replace(" ", "-") === params.neighborhood) &&
      (!params.cuisine || normalize(restaurant.cuisine.join(" ")).includes(params.cuisine.replace("japanese", "japones").replace("italian", "italiana").replace("meat", "carnes"))) &&
      (!params.type || restaurant.category === params.type) &&
      (!params.price || (params.price === "100" ? Boolean(restaurant.priceRange && ["$", "$$"].includes(restaurant.priceRange)) : restaurant.priceRange === params.price)) &&
      (!params.occasion || restaurant.occasions.includes(params.occasion)) &&
      (normalizedRating === undefined || restaurant.godinnerRating >= normalizedRating) &&
      (!params.chef || normalize(restaurant.chef) === params.chef) &&
      (!params.openNow || restaurant.isOpenNow) &&
      (!params.nearby || restaurant.distanceKm <= 5) &&
      (!params.distance || restaurant.distanceKm <= Number(params.distance)) &&
      (!duo || restaurant.acceptsDuoGourmet === (duo === "true")) &&
      (!ids || ids.has(restaurant.id))
    );
  });

  const hasCommunityBudgetCompatibility = (restaurant: Restaurant) => {
    if (params.price !== "100") return false;
    const spend = calculateCommunitySpend(reviews.filter((review) => review.restaurantId === restaurant.id));
    return Boolean(spend && spend.currency === "BRL" && spend.average <= 100);
  };

  return result.sort((a, b) =>
    params.sort === "rating"
      ? b.godinnerRating - a.godinnerRating
      : params.sort === "new"
        ? (b.tags.includes("new") ? 1 : 0) - (a.tags.includes("new") ? 1 : 0)
        : params.nearby || params.sort === "nearby"
          ? a.distanceKm - b.distanceKm
          : q
            ? (normalize(a.name).startsWith(q) ? -1 : 0) - (normalize(b.name).startsWith(q) ? -1 : 0)
            : Number(hasCommunityBudgetCompatibility(b)) - Number(hasCommunityBudgetCompatibility(a)),
  );
}
