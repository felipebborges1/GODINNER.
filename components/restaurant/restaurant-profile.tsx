"use client";

import Link from "next/link";
import { Check, Clipboard, Ellipsis, Heart, ListPlus, MapPin, Share2, Star, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoginWall } from "@/components/auth/login-wall";
import { useAppContext } from "@/hooks/use-app-context";
import { useWantToVisit } from "@/hooks/use-want-to-visit";
import { getFriendIds } from "@/lib/restaurant-social";
import type { Restaurant } from "@/types";
import { CuisineChip } from "@/components/ui/cuisine-chip";
import { PriceBadge } from "@/components/ui/price-badge";
import { RatingBadge } from "@/components/ui/rating-badge";
import { ReviewCard } from "@/components/review/review-card";
import { MapView } from "@/components/search/map-view";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PhotoGallery } from "./photo-gallery";
import { SaveToListSheet } from "./save-to-list-sheet";
import { trackEvent } from "@/lib/analytics";

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export function RestaurantProfile({ restaurant }: { restaurant: Restaurant }) {
  const { currentUserId, reviews, follows, users, showToast } = useAppContext();
  const { isWanted, toggleWantToVisit } = useWantToVisit(restaurant.id);
  const [listsOpen, setListsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => { trackEvent("restaurant_viewed", { restaurantId: restaurant.id }); }, [restaurant.id]);
  const friendIds = useMemo(() => getFriendIds(follows, currentUserId ?? ""), [currentUserId, follows]);
  const restaurantReviews = reviews.filter((review) => review.restaurantId === restaurant.id);
  const friendReviews = restaurantReviews.filter((review) => friendIds.has(review.userId));
  const communityReviews = restaurantReviews.filter((review) => !friendIds.has(review.userId));
  const rating = average(restaurantReviews.map((review) => review.rating));
  const friendsRating = average(friendReviews.map((review) => review.rating));
  const averageSpend = average(restaurantReviews.flatMap((review) => review.amountPerPerson === undefined ? [] : [review.amountPerPerson]));
  const galleryPhotos = [restaurant.coverPhoto, ...restaurant.photos, ...restaurantReviews.flatMap((review) => review.photos)].filter((photo, index, source) => source.findIndex((candidate) => candidate.id === photo.id) === index).slice(0, 5);
  const handleWant = async () => { if (!currentUserId) { setLoginOpen(true); return; } const added = await toggleWantToVisit(restaurant.id); trackEvent(added ? "want_to_visit_added" : "want_to_visit_removed", { restaurantId: restaurant.id }); showToast(added ? "Adicionado a Quero conhecer" : "Removido de Quero conhecer"); };
  const copyLink = async () => { const url = `${window.location.origin}/restaurant/${restaurant.slug}`; try { await navigator.clipboard?.writeText(url); showToast("Link copiado"); } catch { showToast("Link pronto para compartilhar"); } setShareOpen(false); };

  return <div className="pb-28 lg:pb-12">
    <PhotoGallery photos={galleryPhotos} name={restaurant.name}/>
    <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:pt-9">
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-12">
        <div>
          <p className="text-sm font-semibold text-stone-500">{restaurant.category === "bar" ? "Bar" : "Restaurante"} · {restaurant.neighborhood}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{restaurant.name}</h1>
          {restaurant.status === "pending_review" && <p className="mt-3 inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">Aguardando validação</p>}
          <div className="mt-4 flex flex-wrap gap-2">{restaurant.cuisine.map((cuisine) => <CuisineChip key={cuisine} cuisine={cuisine}/>) }<PriceBadge price={restaurant.priceRange}/></div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-stone-600"><span className="inline-flex items-center gap-1"><MapPin size={16}/>{restaurant.neighborhood} · {restaurant.distanceKm.toFixed(1)} km</span>{restaurant.chef && <span className="inline-flex items-center gap-1"><Utensils size={16}/>Chef: {restaurant.chef}</span>}</div>
        </div>
        <section className="mt-6 grid grid-cols-2 gap-3 lg:mt-0"><div className="rounded-3xl bg-stone-950 p-5 text-white"><p className="text-xs font-black uppercase tracking-wide text-stone-300">GODINNER</p><p className="mt-1 text-3xl font-black">{rating?.toFixed(1) ?? "—"}</p><p className="mt-1 text-xs text-stone-300">{rating ? `${restaurantReviews.length} avaliações` : "ainda sem avaliações"}</p></div><div className="rounded-3xl bg-orange-50 p-5"><p className="text-xs font-black uppercase tracking-wide text-orange-700">Seus amigos</p><p className="mt-1 text-3xl font-black">{friendsRating?.toFixed(1) ?? "—"}</p><p className="mt-1 text-xs text-orange-700">{friendsRating ? "nota dos amigos" : "ainda não avaliaram"}</p></div></section>
      </div>
      <section className="mt-7 flex gap-3"><button onClick={handleWant} className={`grid min-h-14 min-w-14 place-items-center rounded-2xl border ${isWanted ? "border-orange-500 bg-orange-500 text-white" : "border-stone-200 bg-white"}`} aria-label={isWanted ? "Remover de Quero conhecer" : "Adicionar a Quero conhecer"}><Heart size={21} fill={isWanted ? "currentColor" : "none"}/></button><Link href={`/review/new?restaurant=${restaurant.slug}`} className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-stone-950 text-sm font-black text-white"><Check size={19}/> Já fui / Avaliar</Link><button onClick={() => setOptionsOpen(true)} className="grid min-h-14 min-w-14 place-items-center rounded-2xl bg-stone-100" aria-label="Mais opções"><Ellipsis size={23}/></button></section>
      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-10"><section><h2 className="text-2xl font-black">Seus amigos</h2>{friendReviews.length ? <div className="mt-4 grid gap-4">{friendReviews.map((review) => <ReviewCard key={review.id} review={review} user={users.find((user) => user.id === review.userId)!}/>)}</div> : <p className="mt-3 text-sm text-stone-500">Seus amigos ainda não avaliaram este lugar.</p>}</section>
          <section><h2 className="text-2xl font-black">Comunidade</h2>{communityReviews.length ? <div className="mt-4 grid gap-4">{communityReviews.map((review) => <ReviewCard key={review.id} review={review} user={users.find((user) => user.id === review.userId)!}/>)}</div> : <p className="mt-3 text-sm text-stone-500">Ainda não há avaliações da comunidade.</p>}</section></div>
        <aside className="space-y-5"><section className="rounded-3xl bg-orange-50 p-5"><p className="text-sm font-black">Preço médio</p><p className="mt-2 text-2xl font-black">{averageSpend ? `R$ ${Math.round(averageSpend)}/pessoa` : "Ainda sem média"}</p><p className="mt-1 text-xs text-stone-500">Média informada pela comunidade</p></section><section className="rounded-3xl border border-stone-100 p-5"><h2 className="text-lg font-black">Sobre</h2><p className="mt-3 flex items-start gap-2 text-sm text-stone-600"><MapPin size={17} className="mt-0.5 shrink-0"/>{restaurant.address}</p></section><section><h2 className="mb-3 text-lg font-black">Localização</h2><MapView restaurants={[restaurant]}/></section></aside>
      </div>
    </main>
    <SaveToListSheet open={listsOpen} onClose={() => setListsOpen(false)} restaurantId={restaurant.id}/>
    <LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next={`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}/>
    <BottomSheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="Opções"><div className="grid gap-2"><button onClick={() => { setOptionsOpen(false); setListsOpen(true); }} className="flex items-center gap-3 rounded-2xl p-3 text-left text-sm font-bold hover:bg-stone-50"><ListPlus size={19}/> Adicionar à lista</button><button onClick={() => { setOptionsOpen(false); setShareOpen(true); }} className="flex items-center gap-3 rounded-2xl p-3 text-left text-sm font-bold hover:bg-stone-50"><Share2 size={19}/> Compartilhar</button></div></BottomSheet>
    <BottomSheet open={shareOpen} onClose={() => setShareOpen(false)} title="Compartilhar restaurante"><button onClick={copyLink} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 py-3 text-sm font-bold text-white"><Clipboard size={18}/> Copiar link</button></BottomSheet>
  </div>;
}
