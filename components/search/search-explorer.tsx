"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin, SlidersHorizontal, X } from "lucide-react";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { FilterChip } from "@/components/search/filter-chip";
import { FilterSheet } from "@/components/search/filter-sheet";
import { SearchBar } from "@/components/search/search-bar";
import { AiSearchPanel } from "@/components/search/ai-search-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAppContext } from "@/hooks/use-app-context";
import { countFriendsWhoVisited, getFriendIds } from "@/lib/restaurant-social";
import { filterRestaurants, normalize } from "@/lib/search";
import { normalizeRatingFilter } from "@/lib/review-rating";
import { distanceKm, hasCoordinates } from "@/lib/distance";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { ExploreLocationPicker } from "@/components/location/explore-location-picker";
import { LocationSearchNudge } from "@/components/location/location-search-nudge";
import { useExploreLocation } from "@/hooks/use-explore-location";
import { useGooglePlaceSearch } from "@/hooks/use-google-place-search";
import { resolveSearchGeography, searchCityLabel, type SearchCity } from "@/lib/search-geography";
import { googleQueryForReview, queryIncludesExplicitPlaceContext } from "@/lib/review/place-search";
import type { GooglePlaceCandidate } from "@/lib/google-place-types";

const MapView = dynamic(() => import("@/components/search/map-view").then((module) => module.MapView), {
  ssr: false,
  loading: () => <LoadingSkeleton className="min-h-[480px] rounded-3xl sm:min-h-[560px] lg:min-h-[620px]"/>,
});

const quick = [
  ["nearby", "true", "Perto de mim"],
  ["type", "bar", "Bar"],
  ["cuisine", "japanese", "Japonês"],
  ["cuisine", "italian", "Italiano"],
  ["price", "100", "Até R$100"],
  ["rating", "4", "Nota 4+"],
  ["occasion", "date", "Date"],
  ["openNow", "true", "Aberto agora"],
] as const;

function reviewNewUrl(place: GooglePlaceCandidate) {
  const query = new URLSearchParams({ placeId: place.placeId, name: place.name, address: place.address });
  if (place.city) query.set("city", place.city);
  if (place.neighborhood) query.set("neighborhood", place.neighborhood);
  if (place.country) query.set("country", place.country);
  if (place.coordinates) {
    query.set("latitude", String(place.coordinates.latitude));
    query.set("longitude", String(place.coordinates.longitude));
  }
  return `/restaurant/new?${query.toString()}`;
}

function googleLocationLabel(place: GooglePlaceCandidate) {
  return [place.address || place.neighborhood, place.city, place.region, place.countryCode && place.countryCode !== "BR" ? place.country : ""].filter(Boolean).join(" · ");
}

export function SearchExplorer({ aiSearchEnabled = false }: { aiSearchEnabled?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const searchParams = useSearchParams();
  const { lists, currentUserId, reviews, restaurants, follows, isLoading, dataError, retryData } = useAppContext();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { mode, manualRegion, devicePosition, requestDeviceLocation, showLocationNudge } = useExploreLocation();
  const { places: externalPlaces, isLoading: isExternalLoading, error: externalError, searchPlaces: searchExternalPlaces, clear: clearExternalSearch } = useGooglePlaceSearch();
  const { showToast } = useToast();
  const params = Object.fromEntries(searchParams.entries());
  const pendingParams = useRef(searchParams.toString());
  const [selectedAmbiguousCity, setSelectedAmbiguousCity] = useState<{ query: string; city: SearchCity } | null>(null);

  useEffect(() => {
    pendingParams.current = searchParams.toString();
    const q = searchParams.get("q");
    const active = ["nearby", "city", "neighborhood", "distance", "type", "cuisine", "price", "duo", "occasion", "rating", "history", "chef", "openNow"].some((key) => searchParams.has(key));
    if (q || active) trackEvent(q ? "search_performed" : "filter_applied", q ? { hasQuery: true } : { hasFilter: true });
  }, [searchParams]);

  useEffect(() => {
    const current = searchParams.get("rating");
    const normalized = normalizeRatingFilter(current ?? undefined);
    if (!current || normalized === undefined || Number(current) <= 5 || Number(current) === normalized) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("rating", String(normalized));
    pendingParams.current = next.toString();
    router.replace(`${path}?${next}`);
  }, [path, router, searchParams]);

  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(pendingParams.current);
    value ? next.set(key, value) : next.delete(key);
    pendingParams.current = next.toString();
    router.replace(`${path}?${next}`);
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (params.view) next.set("view", params.view);
    router.replace(next.size ? `${path}?${next}` : path);
  };

  const clearLocationFilters = () => { const next = new URLSearchParams(pendingParams.current); ["nearby", "distance", "city", "neighborhood", "scope"].forEach((key) => next.delete(key)); pendingParams.current = next.toString(); router.replace(next.size ? `${path}?${next}` : path); };
  const requestNearby = async () => { const success = await requestDeviceLocation("click"); if (success) { clearLocationFilters(); setParam("nearby", "true"); showToast("Localização permitida — distâncias calculadas"); } else { showToast("Localização indisponível — escolha uma região ou explore o catálogo"); } };

  const eligibleRestaurants = useMemo(() => restaurants.filter((restaurant) => restaurant.status !== "rejected" && (restaurant.status !== "pending_review" || restaurant.submittedBy === currentUserId)), [restaurants, currentUserId]);
  const visibleRestaurants = useMemo(() => {
    const origin = devicePosition;
    if (!origin) return eligibleRestaurants;
    return eligibleRestaurants.map((restaurant) => ({
      ...restaurant,
      distanceKm: hasCoordinates(restaurant.coordinates) ? distanceKm(origin, restaurant.coordinates) : Number.POSITIVE_INFINITY,
    }));
  }, [devicePosition, eligibleRestaurants]);
  const fallbackCity = useMemo(() => mode === "manual" && manualRegion && params.scope !== "all"
    ? { city: manualRegion.city, countryCode: manualRegion.countryCode }
    : null, [manualRegion, mode, params.scope]);
  const geography = useMemo(
    () => resolveSearchGeography(visibleRestaurants, params.q ?? "", fallbackCity, selectedAmbiguousCity?.query === (params.q ?? "") ? selectedAmbiguousCity.city : null),
    [fallbackCity, params.q, selectedAmbiguousCity, visibleRestaurants],
  );
  const searchParamsForGeography = useMemo(() => ({ ...params, q: geography.query }), [geography.query, params]);
  const activeDistanceConstraint = Boolean(params.nearby || params.distance);
  const filterForSearch = useCallback((restaurantsToFilter: typeof visibleRestaurants) => filterRestaurants(
    restaurantsToFilter,
    devicePosition || !activeDistanceConstraint
      ? searchParamsForGeography
      : Object.fromEntries(Object.entries(searchParamsForGeography).filter(([key]) => key !== "nearby" && key !== "distance")),
    lists,
    currentUserId,
    reviews,
  ), [activeDistanceConstraint, currentUserId, devicePosition, lists, reviews, searchParamsForGeography]);
  const localResults = useMemo(() => filterForSearch(geography.scopedRestaurants), [filterForSearch, geography.scopedRestaurants]);
  const otherRegionResults = useMemo(
    () => !geography.explicitCity && !geography.ambiguousCities.length && !activeDistanceConstraint && !localResults.length
      ? filterForSearch(geography.otherRegionRestaurants)
      : [],
    [activeDistanceConstraint, filterForSearch, geography.ambiguousCities.length, geography.explicitCity, geography.otherRegionRestaurants, localResults.length],
  );
  const results = localResults.length ? localResults : otherRegionResults;
  const shouldSearchExternal = Boolean((params.q ?? "").trim()) && !results.length && !geography.ambiguousCities.length;
  const externalQuery = googleQueryForReview(params.q ?? "", mode === "manual" ? manualRegion ?? undefined : undefined);
  useEffect(() => {
    if (!shouldSearchExternal) { clearExternalSearch(); return; }
    const timer = window.setTimeout(() => {
      void searchExternalPlaces(externalQuery, mode === "device" && !geography.explicitCity && !queryIncludesExplicitPlaceContext(params.q ?? "") ? devicePosition ?? undefined : undefined);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [clearExternalSearch, devicePosition, externalQuery, geography.explicitCity, mode, params.q, searchExternalPlaces, shouldSearchExternal]);
  const internalPlaceIds = useMemo(() => new Set(eligibleRestaurants.map((restaurant) => restaurant.googlePlaceId).filter(Boolean)), [eligibleRestaurants]);
  const visibleExternalPlaces = externalPlaces.filter((place) => !internalPlaceIds.has(place.placeId));
  const selectExternalPlace = (place: GooglePlaceCandidate) => {
    const existing = eligibleRestaurants.find((restaurant) => restaurant.googlePlaceId === place.placeId && restaurant.status === "published");
    router.push(existing ? `/restaurant/${existing.slug}` : reviewNewUrl(place));
  };
  const friendIds = useMemo(
    () => getFriendIds(follows, currentUserId ?? ""),
    [currentUserId, follows],
  );
  const view = params.view === "map" ? "map" : "list";
  const labels: Record<string, string> = { nearby: "Perto de mim", city: "Cidade", neighborhood: "Bairro", distance: "Distância", type: "Categoria", cuisine: "Culinária", price: "Preço", duo: "Duo Gourmet", occasion: "Ocasião", rating: "Nota", history: "Histórico", chef: "Chef", openNow: "Aberto agora" };
  const valueLabels: Record<string, string> = {
    japanese: "Japonesa", italian: "Italiana", meat: "Carnes", brasileira: "Brasileira",
    mineira: "Mineira", contemporanea: "Contemporânea", restaurant: "Restaurante",
    bar: "Bar", date: "Date", friends: "Amigos", family: "Família",
    wantToVisit: "Quero conhecer", visited: "Já fui", "belo-horizonte": "Belo Horizonte",
    "nova-lima": "Nova Lima", "vila-da-serra": "Vila da Serra",
  };
  const activeFilters = Object.entries(params).filter(([key]) => !["q", "view", "scope"].includes(key));
  const activeFilterLabel = (key: string, value: string) => key === "duo" ? (value === "true" ? "Duo Gourmet" : "Duo Gourmet: Não") : key === "openNow" || key === "nearby" ? labels[key] : `${labels[key]}: ${valueLabels[value] ?? value.replaceAll("-", " ")}`;

  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-10"><LoadingSkeleton className="h-9 w-52"/><LoadingSkeleton className="mt-5 h-12 max-w-xl"/><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <LoadingSkeleton key={index} className="h-80"/>)}</div></div>;
  if (dataError) return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message={dataError} onRetry={retryData}/></div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-10">
      <h1 className="text-3xl font-black">Explorar lugares</h1>
      <div className="mt-5">
        <SearchBar value={params.q ?? ""} onChange={(value) => setParam("q", value || undefined)} onFocus={showLocationNudge} placeholder="Restaurante, comida, bairro ou chef" />
        <div className="mt-1"><ExploreLocationPicker onManualSelected={clearLocationFilters} onDeviceSelected={() => { clearLocationFilters(); setParam("nearby", "true"); }} onExploreAll={clearLocationFilters} /></div>
        <LocationSearchNudge onDeviceSelected={() => { clearLocationFilters(); setParam("nearby", "true"); }} />
      </div>
      <p className="mt-1 text-sm text-stone-500">{mode === "all" ? "Explore o catálogo sem uma região definida." : mode === "manual" ? "Resultados da região selecionada." : "Distâncias calculadas a partir da sua localização atual."}</p>
      {aiSearchEnabled && <div className="mt-5"><AiSearchPanel restaurants={eligibleRestaurants} /></div>}
      <div className="mt-4 flex touch-auto gap-2 overflow-x-auto pb-2">
        {quick.map(([key, value, label]) => (
          <FilterChip key={label} label={label} active={params[key] === value} onClick={() => key === "nearby" ? (params.nearby ? setParam("nearby") : void requestNearby()) : setParam(key, params[key] === value ? undefined : value)} />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex rounded-xl bg-stone-100 p-1">
          <button onClick={() => setParam("view", "list")} aria-pressed={view === "list"} className={`rounded-lg px-3 py-2 text-sm font-bold ${view === "list" ? "bg-white shadow" : ""}`}>Lista</button>
          <button onClick={() => setParam("view", "map")} aria-pressed={view === "map"} className={`rounded-lg px-3 py-2 text-sm font-bold ${view === "map" ? "bg-white shadow" : ""}`}>Mapa</button>
        </div>
        <button onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><SlidersHorizontal size={16} />Filtros</button>
      </div>
      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        params={params}
        onToggle={(key, value) => setParam(key, params[key] === value ? undefined : value)}
        onClear={clearFilters}
        count={results.length}
      />
      {activeFilters.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs font-black text-stone-500">Filtros ativos:</span>{activeFilters.map(([key, value]) => <button key={key} onClick={() => setParam(key)} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">{activeFilterLabel(key, value)}<X size={13} /></button>)}{activeFilters.length > 1 && <button onClick={clearFilters} className="text-xs font-bold text-orange-600">Limpar tudo</button>}</div>}
      {geography.ambiguousCities.length > 0 ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-black">Qual cidade você quis dizer?</p><p className="mt-1 text-sm text-stone-600">Escolha uma opção para manter a busca precisa.</p><div className="mt-3 flex flex-wrap gap-2">{geography.ambiguousCities.map((city) => <button key={`${city.city}-${city.countryCode ?? ""}`} type="button" onClick={() => setSelectedAmbiguousCity({ query: params.q ?? "", city })} className="min-h-10 rounded-xl bg-white px-3 text-sm font-bold ring-1 ring-amber-200">{searchCityLabel(city)}</button>)}</div></div> : <><p className="mt-6 text-sm font-semibold text-stone-500">{results.length} {results.length === 1 ? "resultado" : "resultados"}</p>{geography.explicitCity && <h2 className="mt-1 text-xl font-black">Resultados em {searchCityLabel(geography.explicitCity)}</h2>}{otherRegionResults.length > 0 && <h2 className="mt-4 text-xl font-black">Encontrados em outras regiões</h2>}</>}
      {view === "map" && results.length ? (
        <div className="mt-4"><MapView key={results.map((restaurant) => restaurant.id).join(",")} restaurants={results} /></div>
      ) : results.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} distance={Number.isFinite(restaurant.distanceKm) ? `${restaurant.distanceKm} km` : undefined} friendsVisited={countFriendsWhoVisited(reviews, restaurant.id, friendIds)} />)}
        </div>
      ) : !geography.ambiguousCities.length && <div className="mt-5">{shouldSearchExternal ? <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-5 py-5 text-center sm:px-6 sm:py-12"><MapPin className="mx-auto mb-2 h-5 w-5 text-orange-500 sm:mb-3 sm:h-6 sm:w-6" aria-hidden="true"/><h3 className="font-bold">Nenhum lugar encontrado</h3><p className="mt-1 text-sm text-stone-500">Buscando “{params.q}” também fora do catálogo GODINNER.</p></div> : <EmptyState title={activeDistanceConstraint ? "Nenhum lugar dentro do raio escolhido" : "Nenhum lugar encontrado"} message={activeDistanceConstraint ? "A busca respeitou o raio selecionado. Remova o filtro de distância para ampliar os resultados." : "Ajuste os filtros para explorar mais lugares."} />}</div>}
      {shouldSearchExternal && <section id="google-place-results" className="mt-3 rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:mt-6 sm:p-5"><p className="text-xs font-black uppercase tracking-wide text-orange-600">LUGARES ENCONTRADOS</p><h3 className="mt-1 text-lg font-black">Lugares encontrados</h3><p className="mt-1 text-xs text-stone-500">Dados fornecidos pelo Google</p>{isExternalLoading && <p role="status" className="mt-4 text-sm text-stone-600">Buscando lugares…</p>}{externalError && <div role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><p>Não conseguimos buscar outros lugares agora. Tente novamente em instantes.</p></div>}{!isExternalLoading && !externalError && !visibleExternalPlaces.length && <p className="mt-4 text-sm text-stone-600">Nenhum lugar externo encontrado para esse termo.</p>}{visibleExternalPlaces.length > 0 && <div className="mt-4 grid gap-2">{visibleExternalPlaces.map((place) => <button type="button" key={place.placeId} onClick={() => selectExternalPlace(place)} className="flex min-h-20 items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-stone-100"><span className="min-w-0"><b className="block break-words text-sm">{place.name}</b><span className="mt-1 block break-words text-xs text-stone-500">{googleLocationLabel(place)}</span></span></button>)}</div>}</section>}
    </div>
  );
}
