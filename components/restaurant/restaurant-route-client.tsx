"use client";

import { useEffect, useRef, useState } from "react";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAppContext } from "@/hooks/use-app-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { mapRestaurant } from "@/lib/supabase/mappers";
import { loadPublishedRestaurant } from "@/lib/data/restaurant-profile";
import type { Restaurant } from "@/types";
import { RestaurantProfile } from "./restaurant-profile";

type Result = { status: "loading" } | { status: "error" } | { status: "ready"; restaurant: Restaurant | null };
function ProfileLoading() {
  return <div className="mx-auto max-w-6xl px-4 py-8"><LoadingSkeleton className="h-80"/><LoadingSkeleton className="mt-6 h-10 w-72"/><LoadingSkeleton className="mt-4 h-48"/></div>;
}

// Mounted only for a cache miss; keyed by slug and viewer to discard stale results.
function MissingRestaurantProfile({ slug }: { slug: string }) {
  const [result, setResult] = useState<Result>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const request = useRef<{ attempt: number; promise: Promise<Restaurant | null> } | null>(null);
  useEffect(() => {
    let active = true;
    if (!request.current || request.current.attempt !== attempt) {
      const promise = (async () => {
        const client = createSupabaseBrowserClient();
        if (!client) throw new Error("Configuração indisponível");
        const row = await loadPublishedRestaurant(client, slug);
        return row ? mapRestaurant(row) : null;
      })();
      request.current = { attempt, promise };
    }
    // Reuse the in-flight request through Strict Mode effect replay.
    request.current.promise.then(restaurant => {
      if (active) setResult({ status: "ready", restaurant });
    }).catch(() => { if (active) setResult({ status: "error" }); });
    return () => { active = false; };
  }, [slug, attempt]);
  if (result.status === "loading") return <ProfileLoading/>;
  if (result.status === "error") return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message="Não foi possível carregar este lugar. Tente novamente." onRetry={() => { setResult({ status: "loading" }); setAttempt(value => value + 1); }}/></div>;
  if (!result.restaurant) notFound();
  return <RestaurantProfile restaurant={result.restaurant}/>;
}

export function RestaurantRouteClient({ slug }: { slug: string }) {
  const { restaurants, currentUserId, isLoading, dataError, retryData, dataMode } = useAppContext();
  if (isLoading) return <ProfileLoading/>;
  if (dataError) return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message={dataError} onRetry={retryData}/></div>;
  const restaurant = restaurants.find((item) => item.slug === slug);
  if (!restaurant) {
    if (dataMode === "mock") notFound();
    return <MissingRestaurantProfile key={`${currentUserId ?? "anonymous"}:${slug}`} slug={slug}/>;
  }
  if (restaurant.status === "rejected") return <main className="mx-auto max-w-xl px-4 py-16 text-center"><p className="text-sm font-black text-orange-600">GODINNER</p><h1 className="mt-2 text-3xl font-black">Este cadastro não foi aprovado.</h1><p className="mt-3 text-stone-500">Ele não está disponível para descoberta pública.</p></main>;
  return <RestaurantProfile restaurant={restaurant}/>;
}
