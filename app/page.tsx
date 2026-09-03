"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, MapPin, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/ui/brand";
import { LoginWall } from "@/components/auth/login-wall";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { SearchBar } from "@/components/search/search-bar";
import { FilterChip } from "@/components/search/filter-chip";
import { FriendActivityCard } from "@/components/social/friend-activity-card";
import { DiscoverSection } from "@/components/discover/discover-section";
import { RecommendationSection } from "@/components/discover/recommendation-section";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { EmptyState } from "@/components/ui/empty-state";
import { countFriendsWhoVisited, getFriendIds } from "@/lib/restaurant-social";
import { filterRestaurants } from "@/lib/search";
import { useAppContext } from "@/hooks/use-app-context";
import { useGooglePlaceSearch } from "@/hooks/use-google-place-search";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { trackEvent } from "@/lib/analytics";
import { generateRecommendations } from "@/lib/recommendations/engine";
import { distanceKm, hasCoordinates } from "@/lib/distance";
import type { GooglePlaceCandidate } from "@/lib/google-place-types";

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

export default function DiscoverPage() {
  const router = useRouter();
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [location, setLocation] = useState("Vila da Serra / Nova Lima");
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [externalSearchRequested, setExternalSearchRequested] = useState(false);
  const [isRequestingExternalLocation, setIsRequestingExternalLocation] = useState(false);
  const [selectedExternalPlace, setSelectedExternalPlace] = useState<GooglePlaceCandidate | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const externalSearchAttempt = useRef(0);
  const selectedPlaceConfirmationRef = useRef<HTMLDivElement>(null);
  const { currentUserId, follows, lists, restaurants, reviews, reviewSocial, users, isLoading, dataError, retryData } = useAppContext();
  const { places: externalPlaces, isLoading: isExternalLoading, error: externalError, searchPlaces: searchExternalPlaces, clear: clearExternalSearch } = useGooglePlaceSearch();
  const resetExternalSearch = () => {
    externalSearchAttempt.current += 1;
    setExternalSearchRequested(false);
    setIsRequestingExternalLocation(false);
    setSelectedExternalPlace(null);
    clearExternalSearch();
  };
  useEffect(() => { trackEvent("discover_viewed"); }, []);
  const nearby = useMemo(() => position
    ? restaurants
      .filter((restaurant) => restaurant.status === "published" && hasCoordinates(restaurant.coordinates))
      .map((restaurant) => ({ ...restaurant, distanceKm: distanceKm(position, restaurant.coordinates!) }))
      .filter((restaurant) => restaurant.distanceKm <= 5)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6)
    : restaurants.filter((restaurant) => ["Vila da Serra", "Vale do Sereno"].includes(restaurant.neighborhood)).slice(0, 6), [position, restaurants]);
  const communityFavorites = useMemo(() => [...restaurants].sort((a, b) => b.godinnerRating - a.godinnerRating).slice(0, 4), [restaurants]);
  const datePlaces = useMemo(() => restaurants.filter((restaurant) => restaurant.tags.includes("date")).slice(0, 4), [restaurants]);
  const newPlaces = useMemo(() => restaurants.filter((restaurant) => restaurant.tags.includes("new")).slice(0, 4), [restaurants]);
  const bars = useMemo(() => restaurants.filter((restaurant) => restaurant.tags.includes("bar")).slice(0, 4), [restaurants]);
  const friendIds = useMemo(() => getFriendIds(follows, currentUserId ?? ""), [currentUserId, follows]);
  const friendActivities = reviews.filter((review) => friendIds.has(review.userId)).slice(0, 8);
  const friendCounts = useMemo(() => Object.fromEntries(restaurants.map((restaurant) => [restaurant.id, countFriendsWhoVisited(reviews, restaurant.id, friendIds)])), [friendIds, restaurants, reviews]);
  const hasSearch = Boolean(searchQuery.trim());
  const homeSearchResults = useMemo(() => {
    const eligibleRestaurants = restaurants.filter((restaurant) => restaurant.status !== "rejected" && (restaurant.status !== "pending_review" || restaurant.submittedBy === currentUserId));
    return filterRestaurants(eligibleRestaurants, { q: searchQuery }, lists, currentUserId, reviews);
  }, [currentUserId, lists, restaurants, reviews, searchQuery]);
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
      location: position,
      limit: 6,
    });
  }, [currentUserId, follows, lists, position, restaurants, reviewSocial, reviews]);
  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12"><LoadingSkeleton className="h-5 w-52"/><LoadingSkeleton className="mt-4 h-12 w-full max-w-xl"/><section aria-label="Carregando recomendações" className="mt-10"><LoadingSkeleton className="h-7 w-56"/><LoadingSkeleton className="mt-3 h-5 w-80 max-w-full"/><div className="-mx-4 mt-5 flex gap-4 overflow-hidden px-4 sm:mx-0 sm:px-0">{Array.from({ length: 2 }, (_, index) => <LoadingSkeleton key={index} className="h-72 w-[82vw] max-w-80 shrink-0 sm:w-72"/>)}</div></section></div>;
  if (dataError) return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message={dataError} onRetry={retryData}/></div>;
  const updateLocation = (nextLocation: string) => { setLocation(nextLocation); setIsLocationOpen(false); };
  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setLocationError("Não conseguimos acessar sua localização. Você pode explorar o catálogo disponível."); return; }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setPosition({ latitude: coords.latitude, longitude: coords.longitude }); setLocation("Sua localização"); setIsLocationOpen(false); },
      () => setLocationError("Não conseguimos acessar sua localização. Você pode explorar o catálogo disponível."),
      { timeout: 10_000, maximumAge: 300_000 },
    );
  };
  const runExternalSearch = async (query: string, attempt: number, locationBias?: { latitude: number; longitude: number }) => {
    if (attempt !== externalSearchAttempt.current) return;
    const results = await searchExternalPlaces(query, locationBias);
    if (attempt !== externalSearchAttempt.current) return;
    if (results.length) trackEvent("discover_external_results_shown", { count: results.length, hasLocationBias: Boolean(locationBias) });
  };
  const searchOutsideCatalog = () => {
    if (!hasSearch || isExternalLoading || isRequestingExternalLocation) return;
    const query = searchQuery.trim();
    const attempt = ++externalSearchAttempt.current;
    setExternalSearchRequested(true);
    setSelectedExternalPlace(null);
    trackEvent("discover_external_search_clicked", { hasLocationBias: Boolean(position) });
    if (position) { void runExternalSearch(query, attempt, position); return; }
    if (!navigator.geolocation) { void runExternalSearch(query, attempt); return; }
    setIsRequestingExternalLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (attempt !== externalSearchAttempt.current) return;
        const next = { latitude: coords.latitude, longitude: coords.longitude };
        setPosition(next);
        setIsRequestingExternalLocation(false);
        void runExternalSearch(query, attempt, next);
      },
      () => {
        if (attempt !== externalSearchAttempt.current) return;
        setIsRequestingExternalLocation(false);
        void runExternalSearch(query, attempt);
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
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

  return <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-10">
    <header className="flex items-center justify-between lg:hidden"><Brand/><Link href="/feed" aria-label="Abrir feed" className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-800"><UsersRound size={20}/></Link></header>
    <section className="pt-9 lg:pt-0"><button onClick={() => setIsLocationOpen(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500"><MapPin size={16} className="text-orange-500"/>{location}<ChevronDown size={15}/></button><h1 className="mt-3 max-w-xl text-4xl font-black tracking-[-0.06em] sm:text-5xl">Onde vamos hoje?</h1><p className="mt-3 max-w-lg text-base leading-7 text-stone-600">Descubra lugares através de pessoas em quem você confia.</p><div className="mt-6 max-w-xl"><SearchBar value={searchQuery} onChange={(value) => { setSearchQuery(value); if (!value.trim() || externalSearchRequested || isRequestingExternalLocation) resetExternalSearch(); }} onClear={() => { setSearchQuery(""); resetExternalSearch(); }} placeholder="Restaurante, comida, bairro ou chef"/></div>{!hasSearch && <div className="-mx-4 mt-4 flex touch-auto gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{quickFilters.map((filter) => <FilterChip key={filter.label} label={filter.label} href={filter.href}/>)}</div>}</section>

    {hasSearch ? <section className="mt-8"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-stone-500">{homeSearchResults.length} {homeSearchResults.length === 1 ? "lugar encontrado" : "lugares encontrados"}</p><h2 className="mt-1 text-2xl font-black tracking-tight">Resultados para “{searchQuery.trim()}”</h2></div><Link href={`/search?q=${encodeURIComponent(searchQuery.trim())}`} className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-orange-600">Explorar filtros</Link></div>{homeSearchResults.length ? <><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{homeSearchResults.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} friendsVisited={friendCounts[restaurant.id] ?? 0}/>)}</div><div className="mt-6 rounded-2xl border border-stone-200 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4"><p className="text-sm text-stone-600">Não encontrou o lugar que procura?</p><button type="button" onClick={searchOutsideCatalog} disabled={isExternalLoading || isRequestingExternalLocation} className="mt-2 min-h-11 text-sm font-black text-orange-600 disabled:opacity-60 sm:mt-0">Buscar outros restaurantes</button></div></> : <div className="mt-5 rounded-3xl border border-dashed border-stone-300 p-6 text-center"><h3 className="text-lg font-black">Não encontramos “{searchQuery.trim()}” no GODINNER.</h3><p className="mt-2 text-sm leading-6 text-stone-600">Nenhum lugar encontrado. Ele pode ainda não estar no nosso catálogo.</p><button type="button" onClick={searchOutsideCatalog} disabled={isExternalLoading || isRequestingExternalLocation} className="mt-5 min-h-12 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white disabled:opacity-60">Buscar “{searchQuery.trim()}” perto de mim</button></div>}{externalSearchRequested && <section className="mt-6 rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-orange-600">EXPANDIR BUSCA</p><h3 className="mt-1 text-lg font-black">Lugares encontrados via Google</h3><p className="mt-1 text-xs text-stone-500">Dados fornecidos pelo Google</p></div>{(isExternalLoading || isRequestingExternalLocation) && <span role="status" className="text-sm font-semibold text-stone-500">Buscando…</span>}</div>{(isExternalLoading || isRequestingExternalLocation) && <p role="status" className="mt-4 text-sm text-stone-600">Buscando lugares próximos sem sair da sua busca.</p>}{externalError && <div role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><p>Não conseguimos buscar outros lugares agora.</p><button type="button" onClick={searchOutsideCatalog} className="mt-2 font-black underline">Tentar novamente</button></div>}{!isExternalLoading && !isRequestingExternalLocation && !externalError && !externalPlaces.length && <p className="mt-4 text-sm text-stone-600">Não encontramos lugares externos para esse termo. Você pode tentar outro nome.</p>}{externalPlaces.length > 0 && <div className="mt-4 grid gap-2">{externalPlaces.map((place) => { const isSelected = selectedExternalPlace?.placeId === place.placeId; const distance = position ? formatPlaceDistance(position, place) : null; return <button type="button" key={place.placeId} onClick={() => selectExternalPlace(place)} aria-pressed={isSelected} className={`flex min-h-20 w-full min-w-0 max-w-full items-start justify-between gap-3 rounded-2xl p-4 text-left shadow-sm ring-1 ${isSelected ? "bg-orange-50 ring-2 ring-orange-400" : "bg-white ring-stone-100"}`}><span className="min-w-0 flex-1"><b className="block break-words text-sm leading-5 text-stone-900 line-clamp-2">{place.name}</b><span className="mt-1 block break-words text-xs leading-5 text-stone-500 line-clamp-2">{place.address || [place.neighborhood, place.city, place.country].filter(Boolean).join(" · ")}</span><span className="mt-1 block text-[11px] font-semibold text-stone-400">Encontrado via Google</span></span>{distance && <span className="mt-1 shrink-0 whitespace-nowrap text-xs font-bold text-stone-500">{distance}</span>}</button>; })}</div>}{selectedExternalPlace && <div ref={selectedPlaceConfirmationRef} className="mt-4 scroll-mt-24 rounded-2xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-orange-600">LOCAL ENCONTRADO</p><h4 className="mt-1 break-words font-black">{selectedExternalPlace.name}</h4><p className="mt-1 text-sm text-stone-600">Ainda não está no GODINNER. Você pode registrar a sua experiência.</p><button type="button" onClick={startExternalReview} className="mt-4 min-h-11 rounded-xl bg-orange-500 px-4 text-sm font-black text-white">Avaliar este lugar</button></div>}</section>}</section> : <>
    {currentUserId && recommendations && <RecommendationSection result={recommendations}/>}
    <section className="mt-10"><div className="mb-4 flex items-center justify-between gap-4"><h2 className="min-w-0 flex-1 text-xl font-black leading-tight tracking-tight sm:text-2xl">Seus amigos estão conhecendo</h2><Link href="/feed" className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-stone-700">Ver mais</Link></div><div className="-mx-4 flex touch-auto snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{friendActivities.map((review) => { const user = users.find((item) => item.id === review.userId); const restaurant = restaurants.find((item) => item.id === review.restaurantId); return user && restaurant ? <FriendActivityCard key={review.id} user={user} restaurant={restaurant} review={review}/> : null; })}</div></section>

    {position && !nearby.length ? <section className="mt-10"><EmptyState title="Ainda não temos lugares próximos de você." message="Explore o catálogo GODINNER enquanto chegamos à sua região." actionLabel="Explorar catálogo" actionHref="/search"/></section> : <DiscoverSection title="Perto de você" href="/search" restaurants={nearby} distances={position ? nearby.map((restaurant) => `${restaurant.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`) : ["0,5 km", "0,9 km", "1,2 km", "1,7 km", "2,1 km", "2,4 km"]} friendCounts={friendCounts} prioritizeFirst/>}
    <DiscoverSection title="Queridinhos da comunidade" href="/search?sort=rating" restaurants={communityFavorites} friendCounts={friendCounts}/>
    <DiscoverSection title="Para um date" href="/search?occasion=date" restaurants={datePlaces} friendCounts={friendCounts}/>
    <DiscoverSection title="Novos na região" href="/search?sort=new" restaurants={newPlaces} friendCounts={friendCounts}/>
    <DiscoverSection title="Bares para conhecer" href="/search?type=bar" restaurants={bars} friendCounts={friendCounts}/>
    </>}

    <BottomSheet open={isLocationOpen} onClose={() => setIsLocationOpen(false)} title="Sua localização"><div className="grid gap-2"><button onClick={useCurrentLocation} className="rounded-2xl bg-stone-100 px-4 py-3 text-left text-sm font-semibold text-stone-800">Usar minha localização</button>{["Belo Horizonte", "Nova Lima"].map((option) => <button key={option} onClick={() => updateLocation(option === "Nova Lima" ? "Vila da Serra / Nova Lima" : option)} className="rounded-2xl bg-stone-100 px-4 py-3 text-left text-sm font-semibold text-stone-800">{option}</button>)}{locationError && <p role="status" className="pt-2 text-sm text-stone-600">{locationError}</p>}</div></BottomSheet>
  <LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next={selectedExternalPlace ? reviewNewUrl(selectedExternalPlace) : "/"}/></div>;
}
