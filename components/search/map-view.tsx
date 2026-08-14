"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { hasCoordinates } from "@/lib/distance";
import type { Restaurant } from "@/types";
function formatDistance(distance: number) {
  return Number.isFinite(distance) ? `${distance.toFixed(1)} km` : "Distância indisponível";
}

export function MapView({ restaurants }: { restaurants: Restaurant[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mappableRestaurants = useMemo(() => restaurants.filter((restaurant) => hasCoordinates(restaurant.coordinates)), [restaurants]);
  const bounds = useMemo(() => {
    const latitudes = mappableRestaurants.map((restaurant) => restaurant.coordinates!.latitude);
    const longitudes = mappableRestaurants.map((restaurant) => restaurant.coordinates!.longitude);
    return latitudes.length ? {
      minLatitude: Math.min(...latitudes),
      maxLatitude: Math.max(...latitudes),
      minLongitude: Math.min(...longitudes),
      maxLongitude: Math.max(...longitudes),
    } : null;
  }, [mappableRestaurants]);
  const plottedRestaurants = useMemo(() => {
    if (!bounds) return [];
    const padding = 12;
    const latitudeSpan = bounds.maxLatitude - bounds.minLatitude;
    const longitudeSpan = bounds.maxLongitude - bounds.minLongitude;
    return mappableRestaurants.map((restaurant) => ({
      restaurant,
      x: longitudeSpan ? padding + ((restaurant.coordinates!.longitude - bounds.minLongitude) / longitudeSpan) * (100 - padding * 2) : 50,
      y: latitudeSpan ? padding + ((bounds.maxLatitude - restaurant.coordinates!.latitude) / latitudeSpan) * (100 - padding * 2) : 50,
    }));
  }, [bounds, mappableRestaurants]);
  const selected = mappableRestaurants.find((restaurant) => restaurant.id === selectedId) ?? mappableRestaurants[0];

  return <div className="relative min-h-[480px] overflow-hidden rounded-3xl bg-stone-200">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.7),transparent_35%),linear-gradient(135deg,rgba(255,255,255,.22),rgba(120,113,108,.18))]" aria-hidden="true" />
    {plottedRestaurants.map(({ restaurant, x, y }) => <button key={restaurant.id} onClick={() => setSelectedId(restaurant.id)} aria-label={`Selecionar ${restaurant.name}`} aria-pressed={selected?.id === restaurant.id} className={`absolute z-10 grid h-9 min-w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full px-2 text-xs font-black text-white shadow-lg transition ${selected?.id === restaurant.id ? "bg-orange-500 ring-4 ring-orange-200" : "bg-stone-950 hover:bg-orange-600"}`} style={{ left: `${x}%`, top: `${y}%` }}>{restaurant.godinnerRating ? restaurant.godinnerRating.toFixed(1) : "novo"}</button>)}
    {!mappableRestaurants.length && <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-2xl bg-white/80 p-4 text-center text-sm font-semibold text-stone-600">Nenhum lugar com localização disponível.</p>}
    {selected && <Link href={`/restaurant/${selected.slug}`} className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl"><Image src={selected.coverPhoto.url} alt={selected.name} width={72} height={56} className="h-14 w-18 rounded-xl object-cover"/><div><b>{selected.name}</b><p className="text-sm text-stone-500">{selected.cuisine[0]} · {selected.priceRange} · {formatDistance(selected.distanceKm)}</p></div></Link>}
  </div>;
}
