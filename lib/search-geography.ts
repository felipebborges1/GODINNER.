type LocatedRestaurant = {
  city: string;
  countryCode?: string;
  address?: string;
};

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/\s+/g, " ");

export type SearchCity = {
  city: string;
  countryCode?: string;
  region?: string;
};

export type SearchGeography<T extends LocatedRestaurant> = {
  query: string;
  explicitCity: SearchCity | null;
  ambiguousCities: SearchCity[];
  scopedRestaurants: T[];
  otherRegionRestaurants: T[];
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cityKey(city: SearchCity) {
  return `${normalize(city.city)}:${city.countryCode?.toUpperCase() ?? ""}`;
}

function regionFromAddress(address?: string) {
  const match = address?.match(/(?:^|[\s,-])([A-Z]{2})(?=\s*,?\s*\d{5}(?:-\d{3})?\b)/);
  return match?.[1];
}

function matchesCity(restaurant: LocatedRestaurant, city: SearchCity) {
  return normalize(restaurant.city) === normalize(city.city)
    && (!city.countryCode || !restaurant.countryCode || restaurant.countryCode.toUpperCase() === city.countryCode.toUpperCase());
}

/**
 * Reads a city written alongside a place name (for example "Madero, Cuiabá")
 * from the catalog itself. The selected Explore region is intentionally not
 * changed by this parser.
 */
export function resolveSearchGeography<T extends LocatedRestaurant>(
  restaurants: T[],
  rawQuery: string,
  fallbackCity?: SearchCity | null,
  selectedCity?: SearchCity | null,
): SearchGeography<T> {
  const catalogCities = Array.from(new Map(
    restaurants
      .filter((restaurant) => restaurant.city.trim())
      .map((restaurant) => {
        const city = { city: restaurant.city.trim(), countryCode: restaurant.countryCode, region: regionFromAddress(restaurant.address) };
        return [cityKey(city), city] as const;
      }),
  ).values());
  const normalizedQuery = normalize(rawQuery);
  const matchingCities = catalogCities
    .filter((city) => normalizedQuery.includes(normalize(city.city)))
    .sort((left, right) => right.city.length - left.city.length);
  const distinctNames = Array.from(new Set(matchingCities.map((city) => normalize(city.city))));
  const matchingName = distinctNames[0];
  const cityChoices = matchingName
    ? matchingCities.filter((city) => normalize(city.city) === matchingName)
    : [];
  const uniqueChoices = Array.from(new Map(cityChoices.map((city) => [cityKey(city), city])).values());
  const selectedChoice = selectedCity && uniqueChoices.find((city) => cityKey(city) === cityKey(selectedCity));
  const ambiguousCities = uniqueChoices.length > 1 && !selectedChoice ? uniqueChoices : [];
  const explicitCity = selectedChoice ?? (ambiguousCities.length ? null : uniqueChoices[0] ?? null);
  const query = explicitCity
    ? rawQuery
      .replace(new RegExp(`(?:^|[,;\\s])${escapeRegExp(explicitCity.city)}(?=$|[,;\\s])`, "iu"), " ")
      .replace(/[,;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    : rawQuery.trim();
  const scopedRestaurants = explicitCity
    ? restaurants.filter((restaurant) => matchesCity(restaurant, explicitCity))
    : fallbackCity
      ? restaurants.filter((restaurant) => matchesCity(restaurant, fallbackCity))
      : restaurants;
  const otherRegionRestaurants = explicitCity || !fallbackCity
    ? []
    : restaurants.filter((restaurant) => !matchesCity(restaurant, fallbackCity));

  return { query, explicitCity, ambiguousCities, scopedRestaurants, otherRegionRestaurants };
}

export function searchCityLabel(city: SearchCity) {
  return [city.city, city.region ?? (city.countryCode !== "BR" ? city.countryCode : undefined)].filter(Boolean).join(", ");
}
