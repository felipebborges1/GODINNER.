import type { ExploreLocationMode, ExploreRegion } from "@/context/explore-location-context";

const coverageSessionKey = "godinner.catalog-coverage-session.v1";

export function normalizeCatalogCoveragePart(value: string | undefined | null) {
  return (value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function catalogCoverageKey(region: Pick<ExploreRegion, "city" | "region" | "countryCode">) {
  return [normalizeCatalogCoveragePart(region.city), normalizeCatalogCoveragePart(region.region), (region.countryCode ?? "").trim().toUpperCase()].join("|");
}

export function canCheckCatalogCoverage(mode: ExploreLocationMode, region: ExploreRegion | null) {
  return mode === "device" && Boolean(region?.city && region.countryCode);
}

export function getCatalogCoverageSessionId(storage: Pick<Storage, "getItem" | "setItem">, createId: () => string = () => crypto.randomUUID()) {
  const existing = storage.getItem(coverageSessionKey);
  if (existing) return existing;
  const id = createId();
  storage.setItem(coverageSessionKey, id);
  return id;
}
