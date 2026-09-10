"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/ui/brand";
import { LoginWall } from "@/components/auth/login-wall";
import { ExploreLocationPicker } from "@/components/location/explore-location-picker";
import { LocationSearchNudge } from "@/components/location/location-search-nudge";
import { SearchBar } from "@/components/search/search-bar";
import { FilterChip } from "@/components/search/filter-chip";
import { FriendActivityCard } from "@/components/social/friend-activity-card";
import { DiscoverSection } from "@/components/discover/discover-section";
import { RecommendationSection } from "@/components/discover/recommendation-section";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { EmptyState } from "@/components/ui/empty-state";
import { countFriendsWhoVisited, getFriendIds } from "@/lib/restaurant-social";
import { filterRestaurants, normalize } from "@/lib/search";
import { useAppContext } from "@/hooks/use-app-context";
import { useGooglePlaceSearch } from "@/hooks/use-google-place-search";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { DeferredContent } from "@/components/ui/deferred-content";
import { trackEvent } from "@/lib/analytics";
import { generateRecommendations } from "@/lib/recommendations/engine";
import { distanceKm, hasCoordinates } from "@/lib/distance";
import { useExploreLocation } from "@/hooks/use-explore-location";
import type { GooglePlaceCandidate } from "@/lib/google-place-types";
import { resolveSearchGeography, searchCityLabel, type SearchCity } from "@/lib/search-geography";
import { googleQueryForReview, queryIncludesExplicitPlaceContext } from "@/lib/review/place-search";

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

function formatPlaceDistance(position: { latitude: number; longitude: number }, place: GooglePlaceCandidate) {
  if (!place.coordinates) return null;
  const meters = distanceKm(position, place.coordinates) * 1000;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(meters / 1000)} km`;
}

const quickFilters = [
  { label: "Japonês", href: "/search?cuisine=japanese" },
  { label: "Date", href: "/search?occasion=date" },
  { label: "Bar", href: "/search?type=bar" },
  { label: "Italiano", href: "/search?cuisine=italian" },
  { label: "Até R$100", href: "/search?price=100" },
  { label: "Carnes", href: "/search?cuisine=meat" },
];

function isInManualRegion(city: string, countryCode: string | undefined, region: { city: string; countryCode?: string }) {
  return normalize(city) === normalize(region.city) && (!region.countryCode || !countryCode || region.countryCode.toUpperCase() === countryCode.toUpperCase());
}

export default function DiscoverPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [externalSearchRequested, setExternalSearchRequested] = useState(false);
  const [selectedExternalPlace, setSelectedExternalPlace] = useState<GooglePlaceCandidate | null>(null);
  const [selectedAmbiguousCity, setSelectedAmbiguousCity] = useState<{ query: string; city: SearchCity } | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const externalSearchAttempt = useRef(0);
  const selectedPlaceConfirmationRef = useRef<HTMLDivElement>(null);
  const { mode, manualRegion, devicePosition, requestStatus, showLocationNudge } = useExploreLocation();
  const { currentUserId, follows, lists, restaurants, reviews, reviewSocial, users, isLoading, dataError, retryData } = useAppContext();
  const { places: externalPlaces, isLoading: isExternalLoading, error: externalError, searchPlaces: searchExternalPlaces, clear: clearExternalSearch } = useGooglePlaceSearch();
  const resetExternalSearch = () => {
    externalSearchAttempt.current += 1;
    setExternalSearchRequested(false);
    setSelectedExternalPlace(null);
    clearExternalSearch();
  };
  useEffect(() => { trackEvent("discover_viewed"); }, []);
  const publishedRestaurants = useMemo(() => restaurants.filter((restaurant) => restaurant.status === "published"), [restaurants]);
  // General discovery deliberately keeps the catalog order already used by the Home; L2 adds no ranking rule.
  const generalDiscovery = useMemo(() => publishedRestaurants.slice(0, 6), [publishedRestaurants]);
  const localDiscovery = useMemo(() => mode === "device" && devicePosition
    ? publishedRestaurants
      .filter((restaurant) => hasCoordinates(restaurant.coordinates))
      .map((restaurant) => ({ ...restaurant, distanceKm: distanceKm(devicePosition, restaurant.coordinates!) }))
      .filter((restaurant) => restaurant.distanceKm <= 5)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6)
    : mode === "manual" && manualRegion
      ? publishedRestaurants.filter((restaurant) => isInManualRegion(restaurant.city, restaurant.countryCode, manualRegion)).slice(0, 6)
      : [], [devicePosition, manualRegion, mode, publishedRestaurants]);
  const hasLocalContext = mode === "device" || mode === "manual";
  const useGeneralFallback = hasLocalContext && !localDiscovery.length;
  const primaryDiscovery = hasLocalContext && !useGeneralFallback ? localDiscovery : generalDiscovery;
  const communityFavorites = useMemo(() => [...publishedRestaurants].sort((a, b) => b.godinnerRating - a.godinnerRating).slice(0, 4), [publishedRestaurants]);
  const datePlaces = useMemo(() => publishedRestaurants.filter((restaurant) => restaurant.tags.includes("date")).slice(0, 4), [publishedRestaurants]);
  const newPlaces = useMemo(() => publishedRestaurants.filter((restaurant) => restaurant.tags.includes("new")).slice(0, 4), [publishedRestaurants]);
  const bars = useMemo(() => publishedRestaurants.filter((restaurant) => restaurant.tags.includes("bar")).slice(0, 4), [publishedRestaurants]);
  const friendIds = useMemo(() => getFriendIds(follows, currentUserId ?? ""), [currentUserId, follows]);
  const friendActivities = reviews.filter((review) => friendIds.has(review.userId)).slice(0, 8);
  const friendCounts = useMemo(() => Object.fromEntries(restaurants.map((restaurant) => [restaurant.id, countFriendsWhoVisited(reviews, restaurant.id, friendIds)])), [friendIds, restaurants, reviews]);
  const hasSearch = Boolean(searchQuery.trim());
  const eligibleSearchRestaurants = useMemo(() => restaurants.filter((restaurant) => restaurant.status !== "rejected" && (restaurant.status !== "pending_review" || restaurant.submittedBy === currentUserId)), [currentUserId, restaurants]);
  const homeSearchGeography = useMemo(() => resolveSearchGeography(
    eligibleSearchRestaurants,
    searchQuery,
    mode === "manual" && manualRegion ? { city: manualRegion.city, countryCode: manualRegion.countryCode } : null,
    selectedAmbiguousCity?.query === searchQuery ? selectedAmbiguousCity.city : null,
  ), [eligibleSearchRestaurants, manualRegion, mode, searchQuery, selectedAmbiguousCity]);
  const homeSearchLocalResults = useMemo(() => filterRestaurants(homeSearchGeography.scopedRestaurants, { q: homeSearchGeography.query }, lists, currentUserId, reviews), [currentUserId, homeSearchGeography.query, homeSearchGeography.scopedRestaurants, lists, reviews]);
  const homeSearchOtherRegionResults = useMemo(() => !homeSearchGeography.explicitCity && !homeSearchGeography.ambiguousCities.length && !homeSearchLocalResults.length
    ? filterRestaurants(homeSearchGeography.otherRegionRestaurants, { q: homeSearchGeography.query }, lists, currentUserId, reviews)
    : [], [currentUserId, homeSearchGeography.ambiguousCities.length, homeSearchGeography.explicitCity, homeSearchGeography.otherRegionRestaurants, homeSearchGeography.query, homeSearchLocalResults.length, lists, reviews]);
  const homeSearchResults = homeSearchLocalResults.length ? homeSearchLocalResults : homeSearchOtherRegionResults;
  useEffect(() => {
    if (searchQuery.trim() && !homeSearchResults.length) trackEvent("discover_search_no_results");
  }, [homeSearchResults.length, searchQuery]);
  useEffect(() => {
    if (externalSearchRequested && externalError) trackEvent("discover_external_search_failed");
  }, [externalError, externalSearchRequested]);
  useEffect(() => {
    if (!selectedExternalPlace) return;
    const frame = requestAnimationFrame(() => selectedPlaceConfirmationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [selectedExternalPlace]);
  const recommendations = useMemo(() => {
    if (!currentUserId) return null;
    return generateRecommendations({
      currentUserId,
      restaurants,
      reviews,
      follows,
      lists,
      likes: Object.entries(reviewSocial).filter(([, summary]) => summary.likedByMe).map(([reviewId]) => ({ userId: currentUserId, reviewId })),
      location: devicePosition,
      limit: 6,
    });
  }, [currentUserId, devicePosition, follows, lists, restaurants, reviewSocial, reviews]);
  const runExternalSearch = useCallback(async (query: string, attempt: number, locationBias?: { latitude: number; longitude: number }) => {
    if (attempt !== externalSearchAttempt.current) return;
    const results = await searchExternalPlaces(query, locationBias);
    if (attempt !== externalSearchAttempt.current) return;
    if (results.length) trackEvent("discover_external_results_shown", { count: results.length, hasLocationBias: Boolean(locationBias) });
  }, [searchExternalPlaces]);
  const shouldAutoSearchExternal = hasSearch && !homeSearchResults.length && !homeSearchGeography.ambiguousCities.length;
  useEffect(() => {
    if (!shouldAutoSearchExternal) return;
    const query = searchQuery.trim();
    const attempt = ++externalSearchAttempt.current;
    const timer = window.setTimeout(() => {
      void runExternalSearch(
        googleQueryForReview(query, mode === "manual" ? manualRegion ?? undefined : undefined),
        attempt,
        mode === "device" && !homeSearchGeography.explicitCity && !queryIncludesExplicitPlaceContext(query) ? devicePosition ?? undefined : undefined,
      );
    }, 450);
    return () => window.clearTimeout(timer);
  }, [devicePosition, homeSearchGeography.explicitCity, manualRegion, mode, runExternalSearch, searchQuery, shouldAutoSearchExternal]);
  const searchOutsideCatalog = () => {
    if (!hasSearch || isExternalLoading) return;
    const query = searchQuery.trim();
    const attempt = ++externalSearchAttempt.current;
    setExternalSearchRequested(true);
    setSelectedExternalPlace(null);
    trackEvent("discover_external_search_clicked", { hasLocationBias: Boolean(devicePosition) });
    void runExternalSearch(googleQueryForReview(query, mode === "manual" ? manualRegion ?? undefined : undefined), attempt, mode === "device" && !homeSearchGeography.explicitCity && !queryIncludesExplicitPlaceContext(query) ? devicePosition ?? undefined : undefined);
  };
  const selectExternalPlace = (place: GooglePlaceCandidate) => {
    trackEvent("discover_external_place_selected", { city: place.city, country: place.country });
    const existing = restaurants.find((restaurant) => restaurant.googlePlaceId === place.placeId && restaurant.status === "published");
    if (existing) { router.push(`/restaurant/${existing.slug}`); return; }
    setSelectedExternalPlace(place);
  };
  const startExternalReview = () => {
    if (!selectedExternalPlace) return;
    trackEvent("discover_external_place_review_started", { city: selectedExternalPlace.city, country: selectedExternalPlace.country });
    if (!currentUserId) { setLoginOpen(true); return; }
    router.push(reviewNewUrl(selectedExternalPlace));
  };

  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12"><LoadingSkeleton className="h-5 w-52"/><LoadingSkeleton className="mt-4 h-12 w-full max-w-xl"/><section aria-label="Carregando recomendações" className="mt-10"><LoadingSkeleton className="h-7 w-56"/><LoadingSkeleton className="mt-3 h-5 w-80 max-w-full"/><div className="-mx-4 mt-5 flex gap-4 overflow-hidden px-4 sm:mx-0 sm:px-0">{Array.from({ length: 2 }, (_, index) => <LoadingSkeleton key={index} className="h-72 w-[82vw] max-w-80 shrink-0 sm:w-72"/>)}</div></section></div>;
  if (dataError) return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message={dataError} onRetry={retryData}/></div>;

  return <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-10">
    <header className="flex items-center justify-between lg:hidden"><Brand/><Link href="/feed" aria-label="Abrir feed" className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-800"><UsersRound size={20}/></Link></header>
    <section className="pt-9 lg:pt-0"><h1 className="max-w-xl text-4xl font-black tracking-[-0.06em] sm:text-5xl">Onde vamos hoje?</h1><p className="mt-3 max-w-lg text-base leading-7 text-stone-600">{mode === "all" ? "Busque no catálogo geral ou escolha uma região quando quiser." : "Descubra lugares através de pessoas em quem você confia."}</p><div className="mt-6 max-w-xl"><SearchBar value={searchQuery} onChange={(value) => { setSearchQuery(value); if (!value.trim() || externalSearchRequested) resetExternalSearch(); }} onClear={() => { setSearchQuery(""); resetExternalSearch(); }} onFocus={showLocationNudge} placeholder="Restaurante, comida, bairro ou chef"/><div className="mt-1"><ExploreLocationPicker/></div><LocationSearchNudge/></div>{!hasSearch && <div className="-mx-4 mt-4 flex touch-auto gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{quickFilters.map((filter) => <FilterChip key={filter.label} label={filter.label} href={filter.href}/>)}</div>}</section>

    {hasSearch ? <section className="mt-8"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-stone-500">{homeSearchResults.length} {homeSearchResults.length === 1 ? "lugar encontrado" : "lugares encontrados"}</p><h2 className="mt-1 text-2xl font-black tracking-tight">{homeSearchGeography.explicitCity ? `Resultados em ${searchCityLabel(homeSearchGeography.explicitCity)}` : `Resultados para “${searchQuery.trim()}”`}</h2></div><Link href={`/search?q=${encodeURIComponent(searchQuery.trim())}`} className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-orange-600">Explorar filtros</Link></div>{homeSearchGeography.ambiguousCities.length > 0 ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-black">Qual cidade você quis dizer?</p><div className="mt-3 flex flex-wrap gap-2">{homeSearchGeography.ambiguousCities.map((city) => <button type="button" key={`${city.city}-${city.countryCode ?? ""}`} onClick={() => setSelectedAmbiguousCity({ query: searchQuery, city })} className="min-h-10 rounded-xl bg-white px-3 text-sm font-bold ring-1 ring-amber-200">{searchCityLabel(city)}</button>)}</div></div> : <>{homeSearchOtherRegionResults.length > 0 && <h3 className="mt-4 text-lg font-black">Encontrados em outras regiões</h3>}{homeSearchResults.length ? <><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{homeSearchResults.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} friendsVisited={friendCounts[restaurant.id] ?? 0}/>)}</div><div className="mt-6 rounded-2xl border border-stone-200 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4"><p className="text-sm text-stone-600">Não encontrou o lugar que procura?</p><button type="button" onClick={searchOutsideCatalog} disabled={isExternalLoading} className="mt-2 min-h-11 text-sm font-black text-orange-600 disabled:opacity-60 sm:mt-0">Buscar mais lugares</button></div></> : <div className="mt-5 rounded-3xl border border-dashed border-stone-300 p-6 text-center"><h3 className="text-lg font-black">Buscando “{searchQuery.trim()}” fora do catálogo GODINNER.</h3><p className="mt-2 text-sm leading-6 text-stone-600">Você pode continuar navegando enquanto procuramos.</p></div>}{(externalSearchRequested || shouldAutoSearchExternal) && <section className="mt-6 rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-orange-600">LUGARES ENCONTRADOS</p><h3 className="mt-1 text-lg font-black">Lugares encontrados</h3><p className="mt-1 text-xs text-stone-500">Dados fornecidos pelo Google</p></div>{isExternalLoading && <span role="status" className="text-sm font-semibold text-stone-500">Buscando…</span>}</div>{isExternalLoading && <p role="status" className="mt-4 text-sm text-stone-600">Buscando lugares sem solicitar sua localização.</p>}{externalError && <div role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><p>Não conseguimos buscar outros lugares agora.</p><button type="button" onClick={searchOutsideCatalog} className="mt-2 font-black underline">Tentar novamente</button></div>}{!isExternalLoading && !externalError && !externalPlaces.length && <p className="mt-4 text-sm text-stone-600">Não encontramos lugares externos para esse termo. Você pode tentar outro nome.</p>}{externalPlaces.length > 0 && <div className="mt-4 grid gap-2">{externalPlaces.map((place) => { const isSelected = selectedExternalPlace?.placeId === place.placeId; const distance = devicePosition && !homeSearchGeography.explicitCity ? formatPlaceDistance(devicePosition, place) : null; return <button type="button" key={place.placeId} onClick={() => selectExternalPlace(place)} aria-pressed={isSelected} className={`flex min-h-20 w-full min-w-0 max-w-full items-start justify-between gap-3 rounded-2xl p-4 text-left shadow-sm ring-1 ${isSelected ? "bg-orange-50 ring-2 ring-orange-400" : "bg-white ring-stone-100"}`}><span className="min-w-0 flex-1"><b className="block break-words text-sm leading-5 text-stone-900 line-clamp-2">{place.name}</b><span className="mt-1 block break-words text-xs leading-5 text-stone-500 line-clamp-2">{place.address || [place.neighborhood, place.city, place.country].filter(Boolean).join(" · ")}</span><span className="mt-1 block text-[11px] font-semibold text-stone-400">Encontrado via Google</span></span>{distance && <span className="mt-1 shrink-0 whitespace-nowrap text-xs font-bold text-stone-500">{distance}</span>}</button>; })}</div>}{selectedExternalPlace && <div ref={selectedPlaceConfirmationRef} className="mt-4 scroll-mt-24 rounded-2xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-orange-600">LOCAL ENCONTRADO</p><h4 className="mt-1 break-words font-black">{selectedExternalPlace.name}</h4><p className="mt-1 text-sm text-stone-600">Ainda não está no GODINNER. Você pode registrar a sua experiência.</p><button type="button" onClick={startExternalReview} className="mt-4 min-h-11 rounded-xl bg-orange-500 px-4 text-sm font-black text-white">Avaliar este lugar</button></div>}</section>}</>}</section> : <>
    {currentUserId && recommendations && <RecommendationSection result={recommendations}/>}
    <DeferredContent label="Carregando experiências de amigos"><section className="mt-10"><div className="mb-4 flex items-center justify-between gap-4"><h2 className="min-w-0 flex-1 text-xl font-black leading-tight tracking-tight sm:text-2xl">Seus amigos estão conhecendo</h2><Link href="/feed" className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-stone-700">Ver mais</Link></div><div className="-mx-4 flex touch-auto snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{friendActivities.map((review, index) => { const user = users.find((item) => item.id === review.userId); const restaurant = restaurants.find((item) => item.id === review.restaurantId); return user && restaurant ? <FriendActivityCard key={review.id} user={user} restaurant={restaurant} review={review} mediaPriority={index === 0} mediaEager={index === 1}/> : null; })}</div></section></DeferredContent>

    <DeferredContent label="Carregando lugares para explorar">{requestStatus === "requesting" ? <section className="mt-10" aria-label="Encontrando lugares perto de você"><h2 className="text-xl font-black tracking-tight sm:text-2xl">Encontrando lugares perto de você</h2><LoadingSkeleton className="mt-4 h-72 w-[82vw] max-w-80 sm:w-72"/></section> : !publishedRestaurants.length ? <section className="mt-10"><EmptyState title="Ainda não há lugares publicados" message="Quando novas experiências forem adicionadas, elas aparecerão aqui."/></section> : <DiscoverSection title={useGeneralFallback || mode === "all" ? "Explore no GODINNER" : mode === "device" ? "Perto de você" : `Em ${manualRegion?.city}`} description={useGeneralFallback ? "Explore lugares em outras cidades" : undefined} href={useGeneralFallback || mode === "all" ? "/search?scope=all" : "/search"} restaurants={primaryDiscovery} distances={mode === "device" && !useGeneralFallback ? localDiscovery.map((restaurant) => `${restaurant.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`) : undefined} friendCounts={friendCounts} prioritizeFirst showCatalogLocation={useGeneralFallback || mode === "all"}/>}</DeferredContent>
    <DeferredContent label="Carregando queridinhos da comunidade"><DiscoverSection title="Queridinhos da comunidade" href="/search?sort=rating&scope=all" restaurants={communityFavorites} friendCounts={friendCounts} showCatalogLocation/></DeferredContent>
    <DeferredContent label="Carregando sugestões para date"><DiscoverSection title="Para um date" href="/search?occasion=date&scope=all" restaurants={datePlaces} friendCounts={friendCounts} showCatalogLocation/></DeferredContent>
    <DeferredContent label="Carregando novos restaurantes"><DiscoverSection title="Novos no GODINNER" href="/search?sort=new&scope=all" restaurants={newPlaces} friendCounts={friendCounts} showCatalogLocation/></DeferredContent>
    <DeferredContent label="Carregando bares para conhecer"><DiscoverSection title="Bares para conhecer" href="/search?type=bar&scope=all" restaurants={bars} friendCounts={friendCounts} showCatalogLocation/></DeferredContent>
    </>}

  <LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next={selectedExternalPlace ? reviewNewUrl(selectedExternalPlace) : "/"}/></div>;
}
