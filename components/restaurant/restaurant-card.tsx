"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, UsersRound } from "lucide-react";
import type { Restaurant } from "@/types";
import { CuisineChip } from "@/components/ui/cuisine-chip";
import { PriceBadge } from "@/components/ui/price-badge";
import { RatingBadge } from "@/components/ui/rating-badge";
import { useWantToVisit } from "@/hooks/use-want-to-visit";
import { useToast } from "@/hooks/use-toast";

export function RestaurantCard({ restaurant, distance, friendsVisited = 0, className = "" }: { restaurant: Restaurant; distance?: string; friendsVisited?: number; className?: string }) {
  const { isWanted, toggleWantToVisit } = useWantToVisit(restaurant.id);
  const { showToast } = useToast();
  const handleWant = () => { const wasAdded = toggleWantToVisit(restaurant.id); showToast(wasAdded ? "Adicionado a Quero conhecer" : "Removido de Quero conhecer"); };
  return <article className={`group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-100 transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}><Link href={`/restaurant/${restaurant.slug}`} className="relative block aspect-[4/3] overflow-hidden"><Image src={restaurant.coverPhoto.url} alt={restaurant.name} fill sizes="(min-width: 1024px) 270px, 72vw" className="object-cover transition duration-500 group-hover:scale-105"/><div className="absolute bottom-3 left-3"><RatingBadge rating={restaurant.godinnerRating} label="GODINNER"/></div></Link><div className="p-4"><div className="flex items-start justify-between gap-2"><Link href={`/restaurant/${restaurant.slug}`} className="min-w-0"><h3 className="truncate font-bold text-stone-900">{restaurant.name}</h3></Link></div>{friendsVisited > 0 && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-stone-500"><UsersRound size={14}/>{friendsVisited} amigos foram</p>}<div className="mt-3 flex items-center justify-between gap-2"><CuisineChip cuisine={restaurant.cuisine[0]}/><PriceBadge price={restaurant.priceRange}/></div><p className="mt-3 truncate text-sm text-stone-500">{restaurant.neighborhood}{distance && ` · ${distance}`}</p><button onClick={handleWant} className={`mt-4 inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-bold ${isWanted ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-700"}`} aria-label={isWanted ? `Remover ${restaurant.name} de Quero conhecer` : `Adicionar ${restaurant.name} a Quero conhecer`}><Heart size={16} fill={isWanted ? "currentColor" : "none"}/>Quero conhecer</button></div></article>;
}
