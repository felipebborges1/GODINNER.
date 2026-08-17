"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Ellipsis, Heart, UsersRound } from "lucide-react";
import { useState } from "react";
import { LoginWall } from "@/components/auth/login-wall";
import { CuisineChip } from "@/components/ui/cuisine-chip";
import { PriceBadge } from "@/components/ui/price-badge";
import { RatingBadge } from "@/components/ui/rating-badge";
import { useAppContext } from "@/hooks/use-app-context";
import { useToast } from "@/hooks/use-toast";
import { useWantToVisit } from "@/hooks/use-want-to-visit";
import { trackEvent } from "@/lib/analytics";
import type { Restaurant } from "@/types";
import { GooglePlaceCover } from "./google-place-cover";
import { SaveToListSheet } from "./save-to-list-sheet";

export function RestaurantCard({ restaurant, distance, friendsVisited = 0, className = "" }: { restaurant: Restaurant; distance?: string; friendsVisited?: number; className?: string }) {
  const { isWanted, toggleWantToVisit } = useWantToVisit(restaurant.id);
  const { currentUserId } = useAppContext();
  const { showToast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [listsOpen, setListsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const handleWant = async () => {
    if (!currentUserId) { setLoginOpen(true); return; }
    const wasAdded = await toggleWantToVisit(restaurant.id);
    trackEvent(wasAdded ? "want_to_visit_added" : "want_to_visit_removed", { restaurantId: restaurant.id });
    showToast(wasAdded ? "Adicionado a Quero conhecer" : "Removido de Quero conhecer");
  };

  return <>
    <article className={`group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-100 transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}>
      <Link href={`/restaurant/${restaurant.slug}`} className="relative block aspect-[4/3] overflow-hidden">
        {restaurant.hasGooglePlaceCover ? <GooglePlaceCover slug={restaurant.slug} fallbackUrl={restaurant.coverPhoto.url} alt={restaurant.name} variant="card"/> : <Image src={restaurant.coverPhoto.url} alt={restaurant.name} fill sizes="(min-width: 1024px) 270px, 72vw" className="object-cover transition duration-500 group-hover:scale-105"/>}
        {restaurant.status === "pending_review" ? <span className="absolute bottom-3 left-3 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-white">PENDENTE</span> : restaurant.reviewCount > 0 ? <div className="absolute bottom-3 left-3"><RatingBadge rating={restaurant.godinnerRating} label="GODINNER"/></div> : <span className="absolute bottom-3 left-3 rounded-full bg-stone-950 px-2.5 py-1 text-xs font-bold text-white">novo</span>}
      </Link>
      <div className="p-4">
        <Link href={`/restaurant/${restaurant.slug}`} className="block min-w-0"><h3 className="truncate font-bold text-stone-900">{restaurant.name}</h3></Link>
        {friendsVisited > 0 && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-stone-500"><UsersRound size={14}/>{friendsVisited} amigos foram</p>}
        <div className="mt-3 flex items-center justify-between gap-2"><CuisineChip cuisine={restaurant.cuisine[0]}/><PriceBadge price={restaurant.priceRange}/></div>
        <p className="mt-3 truncate text-sm text-stone-500">{restaurant.neighborhood}{distance && ` · ${distance}`}</p>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={handleWant} className={`grid min-h-10 min-w-10 place-items-center rounded-full ${isWanted ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-700"}`} aria-label={isWanted ? `Remover ${restaurant.name} de Quero conhecer` : `Adicionar ${restaurant.name} a Quero conhecer`}><Heart size={18} fill={isWanted ? "currentColor" : "none"}/></button>
          <button type="button" onClick={() => setListsOpen(true)} className="grid min-h-10 min-w-10 place-items-center rounded-full bg-stone-100 text-stone-700" aria-label={`Mais opções para ${restaurant.name}`}><Ellipsis size={21}/></button>
        </div>
      </div>
    </article>
    <SaveToListSheet open={listsOpen} onClose={() => setListsOpen(false)} restaurantId={restaurant.id}/>
    <LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next={`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}/>
  </>;
}
