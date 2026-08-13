"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { restaurants } from "@/data/mocks";
import type { Restaurant } from "@/types";

export function RestaurantSelector({ onSelect }: { onSelect: (restaurant: Restaurant) => void }) {
  const [query, setQuery] = useState("");
  const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const matches = useMemo(() => restaurants.filter((restaurant) => [restaurant.name, restaurant.neighborhood, ...restaurant.cuisine].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalized)).slice(0, 7), [normalized]);
  const results = query ? matches : restaurants.slice(0, 5);
  return <section className="mx-auto max-w-xl px-4 py-8 lg:py-12"><p className="text-sm font-black text-orange-600">REGISTRAR EXPERIÊNCIA</p><h1 className="mt-1 text-3xl font-black tracking-tight">Onde você foi?</h1><label className="relative mt-6 block"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar restaurante" className="w-full rounded-2xl bg-stone-100 py-4 pl-11 pr-4 text-sm outline-none ring-orange-500 focus:ring-2"/></label><p className="mt-6 text-xs font-black uppercase tracking-wide text-stone-500">{query ? "Resultados" : "Recentes e recomendados"}</p><div className="mt-3 grid gap-2">{results.map((restaurant) => <button key={restaurant.id} onClick={() => onSelect(restaurant)} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-100 hover:ring-orange-300"><Image src={restaurant.coverPhoto.url} alt="" width={64} height={64} className="h-16 w-16 rounded-xl object-cover"/><span className="min-w-0 flex-1"><b className="block truncate text-sm">{restaurant.name}</b><span className="mt-1 block text-xs text-stone-500">{restaurant.neighborhood} · {restaurant.cuisine[0]}</span></span><span className="rounded-full bg-stone-950 px-2 py-1 text-xs font-black text-white">{restaurant.godinnerRating.toFixed(1)}</span></button>)}</div>{query && !results.length && <div className="mt-8 rounded-3xl border border-dashed border-stone-300 p-6 text-center"><b>Não encontrou esse lugar?</b><Link href="/restaurant/new" className="mt-3 block text-sm font-black text-orange-600">+ Adicionar restaurante</Link></div>}</section>;
}
