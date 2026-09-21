"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/hooks/use-app-context";
import { useSearchCatalog } from "@/hooks/use-search-catalog";
import { useGooglePlaceSearch } from "@/hooks/use-google-place-search";
import { normalize } from "@/lib/search";
import { mapReviewUrl } from "@/lib/review/map-review-entry";
import { reviewNewUrl } from "@/lib/review/google-review-entry";
import type { GooglePlaceCandidate } from "@/lib/google-place-types";
import type { Restaurant } from "@/types";

export function RestaurantSelector({ onSelect }: { onSelect: (restaurant: Restaurant) => void }) {
  const { restaurants, currentUserId } = useAppContext();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [searchedQuery, setSearchedQuery] = useState("");
  const term = query.trim();
  const catalog = useSearchCatalog(Boolean(term));
  const { places, isLoading, error, searchPlaces, clear } = useGooglePlaceSearch();
  const eligible = useMemo(() => (term ? catalog.restaurants : restaurants).filter(r =>
    r.status !== "rejected" && (r.status !== "pending_review" || Boolean(currentUserId && r.submittedBy === currentUserId)),
  ), [term, catalog.restaurants, restaurants, currentUserId]);
  const results = useMemo(() => {
    if (!term) return eligible.filter(r => r.status !== "pending_review").slice(0, 5);
    const normalizedQuery = normalize(term);
    return eligible.filter(r => normalize([r.name, r.city, r.neighborhood, ...r.cuisine, r.chef].join(" ")).includes(normalizedQuery)).slice(0, 7);
  }, [eligible, term]);

  useEffect(() => {
    if (term.length < 2) return;
    // Same server-side Places search as Home, without requiring GPS.
    // Preserve city/region typed in the query; never substitute a fixed location.
    const timer = window.setTimeout(() => {
      setSearchedQuery(term);
      void searchPlaces(term);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [term, searchPlaces]);

  const updateQuery = (value: string) => {
    if (value.trim() !== term) {
      clear(); // Invalidate pending responses immediately, before the debounce.
      setSearchedQuery("");
    }
    setQuery(value);
  };
  const chooseGooglePlace = (place: GooglePlaceCandidate) => {
    const existing = eligible.find(r => r.googlePlaceId === place.placeId);
    if (existing) { onSelect(existing); return; }
    router.push(reviewNewUrl(place));
  };
  const externalPending = isLoading || searchedQuery !== term;

  return <section className="mx-auto max-w-xl px-4 py-8 pb-28 lg:py-12">
    <p className="text-sm font-black text-orange-600">REGISTRAR EXPERIÊNCIA</p>
    <h1 className="mt-1 text-3xl font-black tracking-tight">Onde você foi?</h1>
    <label className="relative mt-6 block">
      <span className="sr-only">Buscar restaurante</span>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19}/>
      <input autoFocus value={query} onChange={e => updateQuery(e.target.value)} placeholder="Restaurante ou restaurante e cidade" className="w-full rounded-2xl bg-stone-100 py-4 pl-11 pr-4 text-sm outline-none ring-orange-500 focus:ring-2"/>
    </label>
    <p className="mt-6 text-xs font-black uppercase tracking-wide text-stone-500">{term ? "Resultados no GODINNER" : "Recentes e recomendados"}</p>
    {term && catalog.isLoading && <p role="status" className="mt-3 text-sm text-stone-500">Buscando no catálogo…</p>}
    {term && catalog.error && <div role="alert" className="mt-3 text-sm text-red-700"><p>{catalog.error}</p><button type="button" onClick={catalog.retry} className="min-h-11 font-bold underline">Tentar carregar catálogo novamente</button></div>}
    <div className="mt-3 grid gap-2">{results.map(r => <button type="button" key={r.id} onClick={() => onSelect(r)} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-100">
      <Image src={r.coverPhoto.url} alt="" width={64} height={64} className="h-16 w-16 rounded-xl object-cover"/>
      <span className="min-w-0 flex-1"><b className="block truncate text-sm">{r.name}</b><span className="mt-1 block text-xs text-stone-500">{r.neighborhood} · {r.cuisine[0]}{r.status === "pending_review" && " · Aguardando validação"}</span></span>
      <span className="rounded-full bg-stone-950 px-2 py-1 text-xs font-black text-white">{r.godinnerRating ? r.godinnerRating.toFixed(1) : "novo"}</span>
    </button>)}</div>
    {term && !catalog.isLoading && !catalog.error && !results.length && <p className="mt-3 text-sm text-stone-600">Nenhum lugar encontrado no catálogo GODINNER.</p>}
    {term.length >= 2 && <section aria-label="Resultados do Google" className="mt-5 rounded-3xl border border-stone-200 bg-stone-50 p-4">
      <h2 className="font-black text-orange-600">Lugares encontrados via Google</h2>
      <p className="mt-1 text-xs text-stone-500">Dados fornecidos pelo Google</p>
      {externalPending ? <p role="status" className="mt-4 text-sm text-stone-600">Buscando lugares no Google…</p> : error ? <div role="alert" className="mt-4 text-sm text-red-700"><p>Não conseguimos buscar no Google agora. Tente novamente ou marque o lugar no mapa.</p><button type="button" onClick={() => void searchPlaces(term)} className="min-h-11 font-black underline">Tentar novamente</button></div> : places.length ? <div className="mt-4 grid gap-2">{places.map(place => <button type="button" key={place.placeId} onClick={() => chooseGooglePlace(place)} className="min-h-20 w-full min-w-0 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-stone-100">
        <b className="block break-words text-sm">{place.name}</b><span className="mt-1 block break-words text-xs leading-5 text-stone-600">{place.address || [place.city, place.country].filter(Boolean).join(" · ")}</span><span className="mt-2 block text-xs font-bold text-orange-700">Selecionar para avaliar</span>
      </button>)}</div> : <p className="mt-4 text-sm text-stone-600">Nenhum lugar encontrado no Google. Tente incluir a cidade ou marque no mapa.</p>}
    </section>}
    {term && <div className="mt-4 rounded-2xl border border-dashed border-stone-300 p-4 text-center"><b className="text-sm">Não encontrou o restaurante?</b><Link href={mapReviewUrl(query)} className="mt-2 block min-h-11 content-center text-sm font-black text-orange-600">Marcar no mapa e avaliar</Link></div>}
  </section>;
}
