/**
 * Small, explicit cuisine vocabulary for deterministic matching against the
 * GODINNER catalog. This deliberately does not attempt general fuzzy search.
 */
const CUISINE_ALIASES: Record<string, string> = {
  japones: "japones",
  japonesa: "japones",
  japoneses: "japones",
  japanese: "japones",
  italiano: "italiano",
  italiana: "italiano",
  italian: "italiano",
  arabe: "arabe",
  libanes: "arabe",
  libanesa: "arabe",
  mexicano: "mexicano",
  mexicana: "mexicano",
};

export function normalizeSearchTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeCuisineTerm(value: string) {
  const normalized = normalizeSearchTerm(value);
  return CUISINE_ALIASES[normalized] ?? normalized;
}

export function cuisineTermsMatch(left: string, right: string) {
  return normalizeCuisineTerm(left) === normalizeCuisineTerm(right);
}

export function restaurantMatchesCuisine(cuisines: string[], term: string) {
  return cuisines.some((cuisine) => cuisineTermsMatch(cuisine, term));
}
