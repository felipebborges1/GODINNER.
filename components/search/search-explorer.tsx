"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
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
import { filterRestaurants } from "@/lib/search";
import { normalizeRatingFilter } from "@/lib/review-rating";
import { distanceKm, hasCoordinates } from "@/lib/distance";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

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

export function SearchExplorer({ aiSearchEnabled = false }: { aiSearchEnabled?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const searchParams = useSearchParams();
  const { lists, currentUserId, reviews, restaurants, follows, isLoading, dataError, retryData } = useAppContext();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const { showToast } = useToast();
  const params = Object.fromEntries(searchParams.entries());
  const pendingParams = useRef(searchParams.toString());

  useEffect(() => {
    pendingParams.current = searchParams.toString();
    const q = searchParams.get("q");
    const active = ["nearby", "city", "neighborhood", "distance", "type", "cuisine", "price", "occasion", "rating", "history", "chef", "openNow"].some((key) => searchParams.has(key));
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

  const requestNearby = () => {
    if (!navigator.geolocation) {
      showToast("Localização indisponível — permita o acesso para usar este filtro");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setPosition({ latitude: coords.latitude, longitude: coords.longitude }); setParam("nearby", "true"); showToast("Localização permitida — distâncias calculadas"); },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Permissão negada — permita o acesso para usar este filtro"
          : error.code === error.TIMEOUT
            ? "Tempo esgotado — tente novamente para usar este filtro"
            : "Localização indisponível — permita o acesso para usar este filtro";
        showToast(message);
      },
      { timeout: 8000, maximumAge: 300000 },
    );
  };

  const eligibleRestaurants = useMemo(() => restaurants.filter((restaurant) => restaurant.status !== "rejected" && (restaurant.status !== "pending_review" || restaurant.submittedBy === currentUserId)), [restaurants, currentUserId]);
  const visibleRestaurants = useMemo(() => {
    const origin = position;
    if (!origin) return eligibleRestaurants;
    return eligibleRestaurants.map((restaurant) => ({
      ...restaurant,
      distanceKm: hasCoordinates(restaurant.coordinates) ? distanceKm(origin, restaurant.coordinates) : Number.POSITIVE_INFINITY,
    }));
  }, [eligibleRestaurants, params.distance, params.nearby, position]);

  const results = useMemo(
    () => filterRestaurants(
      visibleRestaurants,
      position || (!params.nearby && !params.distance)
        ? params
        : Object.fromEntries(Object.entries(params).filter(([key]) => key !== "nearby" && key !== "distance")),
      lists,
      currentUserId,
      reviews,
    ),
    [visibleRestaurants, params, position, lists, currentUserId, reviews],
  );
  const friendIds = useMemo(
    () => getFriendIds(follows, currentUserId ?? ""),
    [currentUserId, follows],
  );
  const view = params.view === "map" ? "map" : "list";
  const labels: Record<string, string> = { nearby: "Perto de mim", city: "Cidade", neighborhood: "Bairro", distance: "Distância", type: "Categoria", cuisine: "Culinária", price: "Preço", occasion: "Ocasião", rating: "Nota", history: "Histórico", chef: "Chef", openNow: "Aberto agora" };
  const valueLabels: Record<string, string> = {
    japanese: "Japonesa", italian: "Italiana", meat: "Carnes", brasileira: "Brasileira",
    mineira: "Mineira", contemporanea: "Contemporânea", restaurant: "Restaurante",
    bar: "Bar", date: "Date", friends: "Amigos", family: "Família",
    wantToVisit: "Quero conhecer", visited: "Já fui", "belo-horizonte": "Belo Horizonte",
    "nova-lima": "Nova Lima", "vila-da-serra": "Vila da Serra",
  };
  const activeFilters = Object.entries(params).filter(([key]) => !["q", "view"].includes(key));

  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-10"><LoadingSkeleton className="h-9 w-52"/><LoadingSkeleton className="mt-5 h-12 max-w-xl"/><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <LoadingSkeleton key={index} className="h-80"/>)}</div></div>;
  if (dataError) return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message={dataError} onRetry={retryData}/></div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-10">
      <h1 className="text-3xl font-black">Explorar lugares</h1>
      <p className="mt-1 text-sm text-stone-500">Vila da Serra, Belo Horizonte e Nova Lima</p>
      <div className="mt-5">
        <SearchBar value={params.q ?? ""} onChange={(value) => setParam("q", value || undefined)} placeholder="Restaurante, comida, bairro ou chef" />
      </div>
      {aiSearchEnabled && <div className="mt-5"><AiSearchPanel restaurants={eligibleRestaurants} /></div>}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {quick.map(([key, value, label]) => (
          <FilterChip key={label} label={label} active={params[key] === value} onClick={() => key === "nearby" ? (params.nearby ? setParam("nearby") : requestNearby()) : setParam(key, params[key] === value ? undefined : value)} />
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
      {activeFilters.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs font-black text-stone-500">Filtros ativos:</span>{activeFilters.map(([key, value]) => <button key={key} onClick={() => setParam(key)} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">{key === "openNow" || key === "nearby" ? labels[key] : `${labels[key]}: ${valueLabels[value] ?? value.replaceAll("-", " ")}`}<X size={13} /></button>)}{activeFilters.length > 1 && <button onClick={clearFilters} className="text-xs font-bold text-orange-600">Limpar tudo</button>}</div>}
      <p className="mt-6 text-sm font-semibold text-stone-500">{results.length} {results.length === 1 ? "resultado" : "resultados"}</p>
      {view === "map" && results.length ? (
        <div className="mt-4"><MapView key={results.map((restaurant) => restaurant.id).join(",")} restaurants={results} /></div>
      ) : results.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} distance={`${restaurant.distanceKm} km`} friendsVisited={countFriendsWhoVisited(reviews, restaurant.id, friendIds)} />)}
        </div>
      ) : (
        <div className="mt-5"><EmptyState title="Nenhum lugar encontrado" message={params.q ? `Nada para “${params.q}”. Ajuste sua busca ou filtros.` : "Ajuste os filtros para explorar mais lugares."} actionLabel={params.q ? "Adicionar restaurante" : undefined} actionHref={params.q ? `/restaurant/new?name=${encodeURIComponent(params.q)}` : undefined} /></div>
      )}
    </div>
  );
}
