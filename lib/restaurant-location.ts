export type GoogleAddressComponent = { long_name?: string; longText?: string; shortText?: string; types: string[] };
export type GoogleGeocoderResult = { formatted_address: string; address_components?: GoogleAddressComponent[] };

/**
 * Google returns different address component shapes by country. Keep optional
 * fields optional so a valid pin outside the initial Beta catalog still works.
 */
export function parseRestaurantAddress(result: GoogleGeocoderResult) {
  const components = result.address_components ?? [];
  const get = (...types: string[]) => {
    const component = components.find((item) => types.some((type) => item.types.includes(type)));
    return component?.long_name ?? component?.longText ?? component?.shortText;
  };

  const countryComponent = components.find((item) => item.types.includes("country"));
  const countryCode = countryComponent?.shortText?.trim().toUpperCase();

  return {
    address: result.formatted_address,
    city: get("locality", "postal_town", "administrative_area_level_2", "administrative_area_level_1"),
    neighborhood: get("neighborhood", "sublocality_level_1", "sublocality"),
    region: get("administrative_area_level_1"),
    country: get("country"),
    ...(countryCode && /^[A-Z]{2}$/.test(countryCode) ? { countryCode } : {}),
  };
}
