"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Ellipsis, Heart, UsersRound } from "lucide-react";
import { useState } from "react";
import { LoginWall } from "@/components/auth/login-wall";
import { CuisineChip } from "@/components/ui/cuisine-chip";
import { DuoGourmetIndicator } from "@/components/ui/duo-gourmet-indicator";
import { PriceBadge } from "@/components/ui/price-badge";
import { GodinnerRatingSummary } from "@/components/ui/godinner-rating-summary";
import { useAppContext } from "@/hooks/use-app-context";
import { useToast } from "@/hooks/use-toast";
import { useWantToVisit } from "@/hooks/use-want-to-visit";
import { trackEvent } from "@/lib/analytics";
import type { Restaurant } from "@/types";
import { GooglePlaceCover, RestaurantPhotoUnavailable } from "./google-place-cover";
import { SaveToListSheet } from "./save-to-list-sheet";

const countryNames: Record<string, string> = { AR: "Argentina", BR: "Brasil", ES: "Espanha", FR: "França", GB: "Reino Unido", IT: "Itália", PT: "Portugal", US: "Estados Unidos" };
function catalogLocation(restaurant: Restaurant) {
  const state = restaurant.address.match(/(?:-|,)\s*([A-Z]{2})(?=\s*[,\-]|\s*$)/)?.[1];
  const country = restaurant.countryCode && restaurant.countryCode !== "BR" ? countryNames[restaurant.countryCode] ?? restaurant.countryCode : null;
  return [restaurant.city, state, country].filter(Boolean).join(" · ");
}

export function RestaurantCard({ restaurant, distance, friendsVisited = 0, className = "", imagePriority = false, imageEager = false, onRestaurantClick, showCatalogLocation = false }: { restaurant: Restaurant; distance?: string; friendsVisited?: number; className?: string; imagePriority?: boolean; imageEager?: boolean; onRestaurantClick?: () => void; showCatalogLocation?: boolean }) {
  const { isWanted, toggleWantToVisit } = useWantToVisit(restaurant.id);
  const { currentUserId, dataError, isLoading } = useAppContext();
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
      <Link href={`/restaurant/${restaurant.slug}`} onClick={onRestaurantClick} className="relative block aspect-[4/3] overflow-hidden">
        {restaurant.hasGooglePlaceCover ? <GooglePlaceCover slug={restaurant.slug} alt={restaurant.name} variant="card" priority={imagePriority} eager={imageEager}/> : restaurant.coverPhoto.url ? <Image src={restaurant.coverPhoto.url} alt={restaurant.name} fill priority={imagePriority} loading={imagePriority ? undefined : imageEager ? "eager" : "lazy"} sizes="(min-width: 1024px) 270px, 72vw" className="object-cover transition duration-500 group-hover:scale-105"/> : <RestaurantPhotoUnavailable alt={restaurant.name} variant="card"/>}
        {restaurant.status === "pending_review" ? <span className="absolute bottom-3 left-3 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-white">PENDENTE</span> : <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)]"><GodinnerRatingSummary rating={restaurant.godinnerRating} reviewCount={restaurant.reviewCount} isLoading={isLoading} isUnavailable={Boolean(dataError)}/></div>}
      </Link>
      <div className="p-4">
        <Link href={`/restaurant/${restaurant.slug}`} onClick={onRestaurantClick} className="block min-w-0"><h3 className="truncate font-bold text-stone-900">{restaurant.name}</h3></Link>
        {friendsVisited > 0 && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-stone-500"><UsersRound size={14}/>{friendsVisited} amigos foram</p>}
        <div className="mt-3 flex items-center justify-between gap-2"><CuisineChip cuisine={restaurant.cuisine[0]}/><PriceBadge price={restaurant.priceRange}/></div>
        {restaurant.acceptsDuoGourmet && <div className="mt-2"><DuoGourmetIndicator/></div>}
        <p className="mt-3 truncate text-sm text-stone-500">{showCatalogLocation ? catalogLocation(restaurant) : restaurant.neighborhood}{distance && ` · ${distance}`}</p>
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
