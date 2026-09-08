type ReviewPlaceRestaurant = {
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  countryCode?: string;
};

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/\s+/g, " ");

/**
 * Internal search stays intentionally broad, so a person can still choose the
 * correct unit. This separate rule decides whether Google needs to complement
 * it: a visible result must actually share the restaurant name being searched.
 */
export function hasConfidentInternalPlaceMatch(query: string, restaurants: Pick<ReviewPlaceRestaurant, "name">[]) {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return false;

  return restaurants.some((restaurant) => {
    const name = normalize(restaurant.name);
    return name === normalizedQuery || normalizedQuery.includes(name) || name.includes(normalizedQuery);
  });
}

/** A city/region written with the place query must not be biased by the current device region. */
export function queryIncludesExplicitPlaceContext(query: string) {
  const compact = query.trim();
  return /[,;]|\s[-–—]\s|\b(em|em\s+|na|no)\s+[\p{L}]/iu.test(compact) || /\b[A-Z]{2}\b/.test(compact);
}

export function googleQueryForReview(query: string, region?: { city: string; region?: string; country?: string; scopeType?: "city" | "state" | "country" | "unknown" }) {
  if (!region) return query.trim();
  if (queryIncludesExplicitPlaceContext(query)) {
    const stateName = region.region || region.city;
    const normalizedQuery = normalize(query);
    if (region.scopeType === "state" && region.country && normalizedQuery.includes(normalize(stateName)) && !normalizedQuery.includes(normalize(region.country))) {
      return `${query.trim()}, ${region.country}`;
    }
    return query.trim();
  }
  const suffixParts = region.scopeType === "state"
    ? [region.region || region.city, region.country]
    : [region.city, region.region || region.country];
  const suffix = [...new Map(suffixParts.filter(Boolean).map((part) => [normalize(part as string), part])).values()].join(", ");
  return suffix ? `${query.trim()}, ${suffix}` : query.trim();
}

export function restaurantLocationLabel(restaurant: ReviewPlaceRestaurant) {
  const local = restaurant.address || restaurant.neighborhood;
  const country = restaurant.countryCode && restaurant.countryCode !== "BR" ? restaurant.countryCode : "";
  return [local, restaurant.city, country].filter(Boolean).join(" · ");
}
