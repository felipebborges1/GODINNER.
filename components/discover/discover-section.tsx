import Link from "next/link";
import type { Restaurant } from "@/types";
import { ArrowRight } from "lucide-react";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";

export function DiscoverSection({ title, restaurants, href, distances = [], friendCounts = {}, prioritizeFirst = false }: { title: string; restaurants: Restaurant[]; href: string; distances?: string[]; friendCounts?: Record<string, number>; prioritizeFirst?: boolean }) {
  if (!restaurants.length) return null;
  return <section className="mt-10"><div className="mb-4 flex items-end justify-between gap-4"><h2 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h2><Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-bold text-stone-700">Ver mais <ArrowRight size={15}/></Link></div><div aria-label={`Carrossel ${title}`} className="-mx-4 flex touch-pan-x snap-x snap-mandatory scroll-smooth scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible">{restaurants.map((restaurant, index) => <RestaurantCard key={restaurant.id} restaurant={restaurant} distance={distances[index]} friendsVisited={friendCounts[restaurant.id] ?? 0} imagePriority={prioritizeFirst && index === 0} className="w-[82vw] min-w-0 max-w-80 shrink-0 snap-start sm:w-72 lg:w-auto lg:max-w-none"/>)}</div></section>;
}
