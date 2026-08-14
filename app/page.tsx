"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, MapPin, UsersRound } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { SearchBar } from "@/components/search/search-bar";
import { FilterChip } from "@/components/search/filter-chip";
import { FriendActivityCard } from "@/components/social/friend-activity-card";
import { DiscoverSection } from "@/components/discover/discover-section";
import { countFriendsWhoVisited, getFriendIds } from "@/lib/restaurant-social";
import { useAppContext } from "@/hooks/use-app-context";

const quickFilters = [
  { label: "Japonês", href: "/search?cuisine=japanese" },
  { label: "Date", href: "/search?occasion=date" },
  { label: "Bar", href: "/search?type=bar" },
  { label: "Italiano", href: "/search?cuisine=italian" },
  { label: "Até R$100", href: "/search?price=100" },
  { label: "Carnes", href: "/search?cuisine=meat" },
];

export default function DiscoverPage() {
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [location, setLocation] = useState("Vila da Serra / Nova Lima");
  const { currentUserId, follows, restaurants, reviews, users } = useAppContext();
  const nearby = useMemo(() => restaurants.filter((restaurant) => ["Vila da Serra", "Vale do Sereno"].includes(restaurant.neighborhood)).slice(0, 6), [restaurants]);
  const communityFavorites = useMemo(() => [...restaurants].sort((a, b) => b.godinnerRating - a.godinnerRating).slice(0, 4), [restaurants]);
  const datePlaces = useMemo(() => restaurants.filter((restaurant) => restaurant.tags.includes("date")).slice(0, 4), [restaurants]);
  const newPlaces = useMemo(() => restaurants.filter((restaurant) => restaurant.tags.includes("new")).slice(0, 4), [restaurants]);
  const bars = useMemo(() => restaurants.filter((restaurant) => restaurant.tags.includes("bar")).slice(0, 4), [restaurants]);
  const friendIds = useMemo(() => getFriendIds(follows, currentUserId ?? ""), [currentUserId]);
  const friendActivities = reviews.filter((review) => friendIds.has(review.userId)).slice(0, 8);
  const friendCounts = useMemo(() => Object.fromEntries(restaurants.map((restaurant) => [restaurant.id, countFriendsWhoVisited(reviews, restaurant.id, friendIds)])), [friendIds]);
  const updateLocation = (nextLocation: string) => { setLocation(nextLocation); setIsLocationOpen(false); };

  return <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-10">
    <header className="flex items-center justify-between lg:hidden"><Brand/><Link href="/feed" aria-label="Abrir feed" className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-800"><UsersRound size={20}/></Link></header>
    <section className="pt-9 lg:pt-0"><button onClick={() => setIsLocationOpen(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500"><MapPin size={16} className="text-orange-500"/>{location}<ChevronDown size={15}/></button><h1 className="mt-3 max-w-xl text-4xl font-black tracking-[-0.06em] sm:text-5xl">Onde vamos hoje?</h1><div className="mt-6 max-w-xl"><SearchBar navigateOnFocus placeholder="Restaurante, comida, bairro ou chef"/></div><div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{quickFilters.map((filter) => <FilterChip key={filter.label} label={filter.label} href={filter.href}/>)}</div></section>

    <section className="mt-10"><div className="mb-4 flex items-end justify-between"><h2 className="text-xl font-black tracking-tight sm:text-2xl">Seus amigos estão conhecendo</h2><Link href="/feed" className="text-sm font-bold text-stone-700">Ver mais</Link></div><div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{friendActivities.map((review) => { const user = users.find((item) => item.id === review.userId); const restaurant = restaurants.find((item) => item.id === review.restaurantId); return user && restaurant ? <FriendActivityCard key={review.id} user={user} restaurant={restaurant} review={review}/> : null; })}</div></section>

    <DiscoverSection title="Perto de você" href="/search?nearby=true" restaurants={nearby} distances={["0,5 km", "0,9 km", "1,2 km", "1,7 km", "2,1 km", "2,4 km"]} friendCounts={friendCounts}/>
    <DiscoverSection title="Queridinhos da comunidade" href="/search?sort=rating" restaurants={communityFavorites} friendCounts={friendCounts}/>
    <DiscoverSection title="Para um date" href="/search?occasion=date" restaurants={datePlaces} friendCounts={friendCounts}/>
    <DiscoverSection title="Novos na região" href="/search?sort=new" restaurants={newPlaces} friendCounts={friendCounts}/>
    <DiscoverSection title="Bares para conhecer" href="/search?type=bar" restaurants={bars} friendCounts={friendCounts}/>

    <BottomSheet open={isLocationOpen} onClose={() => setIsLocationOpen(false)} title="Sua localização"><div className="grid gap-2">{["Usar minha localização", "Belo Horizonte", "Nova Lima"].map((option) => <button key={option} onClick={() => updateLocation(option === "Nova Lima" ? "Vila da Serra / Nova Lima" : option)} className="rounded-2xl bg-stone-100 px-4 py-3 text-left text-sm font-semibold text-stone-800">{option}</button>)}</div></BottomSheet>
  </div>;
}
