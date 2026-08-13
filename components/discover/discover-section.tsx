import Link from "next/link";
import type { Restaurant } from "@/types";
import { ArrowRight } from "lucide-react";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";

export function DiscoverSection({ title, restaurants, href, distances = [], friendCounts = {} }: { title: string; restaurants: Restaurant[]; href: string; distances?: string[]; friendCounts?: Record<string, number> }) {
  if (!restaurants.length) return null;
  return <section className="mt-10"><div className="mb-4 flex items-end justify-between gap-4"><h2 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h2><Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-stone-700">Ver mais <ArrowRight size={15}/></Link></div><div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible">{restaurants.map((restaurant, index) => <RestaurantCard key={restaurant.id} restaurant={restaurant} distance={distances[index]} friendsVisited={friendCounts[restaurant.id] ?? 0} className="w-[72vw] max-w-72 snap-start sm:w-64 lg:w-auto lg:max-w-none"/>)}</div></section>;
}
