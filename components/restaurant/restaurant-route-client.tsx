"use client";

import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAppContext } from "@/hooks/use-app-context";
import { RestaurantProfile } from "./restaurant-profile";

export function RestaurantRouteClient({ slug }: { slug: string }) {
  const { restaurants, isLoading, dataError, retryData } = useAppContext();
  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-8"><LoadingSkeleton className="h-80"/><LoadingSkeleton className="mt-6 h-10 w-72"/><LoadingSkeleton className="mt-4 h-48"/></div>;
  if (dataError) return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message={dataError} onRetry={retryData}/></div>;
  const restaurant = restaurants.find((item) => item.slug === slug);
  if (!restaurant) notFound();
  if (restaurant.status === "rejected") return <main className="mx-auto max-w-xl px-4 py-16 text-center"><p className="text-sm font-black text-orange-600">GODINNER</p><h1 className="mt-2 text-3xl font-black">Este cadastro não foi aprovado.</h1><p className="mt-3 text-stone-500">Ele não está disponível para descoberta pública.</p></main>;
  return <RestaurantProfile restaurant={restaurant}/>;
}
