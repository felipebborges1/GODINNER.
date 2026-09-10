"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { LoaderCircle, MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/hooks/use-app-context";
import { useExploreLocation } from "@/hooks/use-explore-location";
import { useGooglePlaceSearch } from "@/hooks/use-google-place-search";
import { googleQueryForReview, hasConfidentInternalPlaceMatch, queryIncludesExplicitPlaceContext, restaurantLocationLabel } from "@/lib/review/place-search";
import { mapReviewUrl } from "@/lib/review/map-review-entry";
import { MapReviewEntryCta } from "@/components/review/map-review-entry-cta";
import { normalize } from "@/lib/search";
import { resolveSearchGeography, searchCityLabel, type SearchCity } from "@/lib/search-geography";
import type { GooglePlaceCandidate } from "@/lib/google-place-types";
import type { Restaurant } from "@/types";

type RestaurantSelectorProps = {
  onSelect: (restaurant: Restaurant) => void;
  onSelectExternal: (place: GooglePlaceCandidate) => void;
};

function googleLocationLabel(place: GooglePlaceCandidate) {
  return [place.address || place.neighborhood, place.city, place.region, place.countryCode && place.countryCode !== "BR" ? place.country : ""].filter(Boolean).join(" · ");
}

export function RestaurantSelector({ onSelect, onSelectExternal }: RestaurantSelectorProps) {
  const router = useRouter();
  const { restaurants, currentUserId } = useAppContext();
  const { mode, manualRegion, devicePosition } = useExploreLocation();
  const [query, setQuery] = useState("");
  const [externalRequested, setExternalRequested] = useState(false);
  const [externalSearchStartedFor, setExternalSearchStartedFor] = useState<string | null>(null);
  const [selectedAmbiguousCity, setSelectedAmbiguousCity] = useState<{ query: string; city: SearchCity } | null>(null);
  const { places, resultQuery, isLoading, error: externalError, searchPlaces, clear } = useGooglePlaceSearch();

  const candidates = useMemo(() => restaurants.filter((restaurant) => (
      restaurant.status !== "rejected"
      && (restaurant.status !== "pending_review" || restaurant.submittedBy === currentUserId)
    )), [currentUserId, restaurants]);
  const geography = useMemo(() => resolveSearchGeography(
    candidates,
    query,
    mode === "manual" && manualRegion ? { city: manualRegion.city, countryCode: manualRegion.countryCode } : null,
    selectedAmbiguousCity?.query === query ? selectedAmbiguousCity.city : null,
  ), [candidates, manualRegion, mode, query, selectedAmbiguousCity]);
  const matchingRestaurants = useCallback((source: Restaurant[]) => {
    const normalizedQuery = normalize(geography.query);
    if (!normalizedQuery) return source.slice(0, 5);
    return source.filter((restaurant) => normalize([
      restaurant.name,
      restaurant.address,
      restaurant.neighborhood,
      restaurant.city,
      ...restaurant.cuisine,
      restaurant.chef,
    ].join(" ")).includes(normalizedQuery)).slice(0, 7);
  }, [geography.query]);
  const localInternalResults = useMemo(() => matchingRestaurants(geography.scopedRestaurants), [geography.scopedRestaurants, matchingRestaurants]);
  const otherRegionInternalResults = useMemo(() => !geography.explicitCity && !geography.ambiguousCities.length && !localInternalResults.length
    ? matchingRestaurants(geography.otherRegionRestaurants)
    : [], [geography.ambiguousCities.length, geography.explicitCity, geography.otherRegionRestaurants, localInternalResults.length, matchingRestaurants]);
  const internalResults = localInternalResults.length ? localInternalResults : otherRegionInternalResults;

  const confidentInternalMatch = useMemo(
    () => hasConfidentInternalPlaceMatch(query, internalResults),
    [internalResults, query],
  );
  const automaticExternalSearch = query.trim().length >= 2 && !confidentInternalMatch && !geography.ambiguousCities.length;
  const shouldSearchExternal = automaticExternalSearch || externalRequested;

  useEffect(() => {
    if (!shouldSearchExternal) {
      clear();
      return;
    }

    const useExplicitCity = Boolean(geography.explicitCity) || queryIncludesExplicitPlaceContext(query);
    const contextualRegion = mode === "manual" ? manualRegion ?? undefined : undefined;
    const googleQuery = googleQueryForReview(query, contextualRegion);
    const position = mode === "device" && !useExplicitCity ? devicePosition ?? undefined : undefined;
    const timer = window.setTimeout(() => {
      setExternalSearchStartedFor(query);
      void searchPlaces(googleQuery, position);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [clear, devicePosition, geography.explicitCity, manualRegion, mode, query, searchPlaces, shouldSearchExternal]);

  const internalPlaceIds = useMemo(() => new Set(internalResults.map((restaurant) => restaurant.googlePlaceId).filter(Boolean)), [internalResults]);
  const currentGoogleQuery = googleQueryForReview(query, mode === "manual" ? manualRegion ?? undefined : undefined);
  const externalResults = !externalError && resultQuery === currentGoogleQuery ? places.filter((place) => !internalPlaceIds.has(place.placeId)) : [];
  const hasQuery = query.trim().length >= 2;
  const startMapReview = () => router.push(mapReviewUrl({ query, manualRegion: mode === "manual" ? manualRegion ?? undefined : undefined, devicePosition: mode === "device" ? devicePosition ?? undefined : undefined }));

  return <section className="mx-auto max-w-xl px-4 py-8 pb-28 lg:py-12">
    <p className="text-sm font-black text-orange-600">REGISTRAR EXPERIÊNCIA</p>
    <h1 className="mt-1 text-3xl font-black tracking-tight">Qual lugar você quer avaliar?</h1>
    <p className="mt-2 text-sm text-stone-600">Encontre o restaurante e siga direto para escrever sua experiência.</p>
    <label className="relative mt-6 block">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19}/>
      <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setExternalRequested(false); setExternalSearchStartedFor(null); clear(); }} placeholder="Nome do restaurante ou cidade" className="w-full rounded-2xl bg-stone-100 py-4 pl-11 pr-4 text-sm outline-none ring-orange-500 focus:ring-2"/>
    </label>

    <p className="mt-6 text-xs font-black uppercase tracking-wide text-stone-500">{hasQuery ? "No GODINNER" : "Recentes e recomendados"}</p>
    {geography.ambiguousCities.length > 0 && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-black">Qual cidade você quis dizer?</p><div className="mt-3 flex flex-wrap gap-2">{geography.ambiguousCities.map((city) => <button type="button" key={`${city.city}-${city.countryCode ?? ""}`} onClick={() => setSelectedAmbiguousCity({ query, city })} className="min-h-10 rounded-xl bg-white px-3 text-sm font-bold ring-1 ring-amber-200">{searchCityLabel(city)}</button>)}</div></div>}
    {otherRegionInternalResults.length > 0 && <p className="mt-3 text-sm font-bold text-stone-600">Encontrados em outras regiões</p>}
    <div className="mt-3 grid gap-2">
      {internalResults.map((restaurant) => <button key={restaurant.id} type="button" onClick={() => onSelect(restaurant)} className="flex min-h-20 items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-100">
        <Image src={restaurant.coverPhoto.url} alt="" width={64} height={64} className="h-16 w-16 rounded-xl object-cover"/>
        <span className="min-w-0 flex-1"><b className="block truncate text-sm">{restaurant.name}</b><span className="mt-1 block truncate text-xs text-stone-500">{restaurantLocationLabel(restaurant)}{restaurant.status === "pending_review" && " · Aguardando validação"}</span></span>
        <span className="rounded-full bg-stone-950 px-2 py-1 text-xs font-black text-white">{restaurant.godinnerRating ? restaurant.godinnerRating.toFixed(1) : "novo"}</span>
      </button>)}
    </div>

    {hasQuery && internalResults.length > 0 && !externalRequested && <button type="button" onClick={() => setExternalRequested(true)} className="mt-4 min-h-11 text-sm font-black text-orange-600">Buscar mais lugares</button>}

    {hasQuery && shouldSearchExternal && <div className="mt-6">
      <p className="text-xs font-black uppercase tracking-wide text-stone-500">Outros lugares</p>
      {isLoading && <p role="status" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-stone-500"><LoaderCircle className="animate-spin" size={16}/> Buscando mais lugares…</p>}
      {externalError && <div className="mt-3"><MapReviewEntryCta failed onStart={startMapReview}/></div>}
      {!isLoading && !externalError && externalResults.length > 0 && <div className="mt-3 grid gap-2">{externalResults.map((place) => <button key={place.placeId} type="button" onClick={() => onSelectExternal(place)} className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/50 p-4 text-left"><span className="min-w-0"><b className="block truncate text-sm">{place.name}</b><span className="mt-1 block truncate text-xs text-stone-600">{googleLocationLabel(place)}</span></span><MapPin className="shrink-0 text-orange-500" size={18}/></button>)}</div>}
      {!isLoading && !externalError && externalSearchStartedFor === query && externalResults.length === 0 && <div className="mt-3"><MapReviewEntryCta onStart={startMapReview}/></div>}
    </div>}
  </section>;
}
