"use client";
import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/hooks/use-app-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { mapRestaurant } from "@/lib/supabase/mappers";
import { loadSearchCatalog, searchCatalogView } from "@/lib/data/catalog-pagination";
import { averageReviewScore, getReviewScore } from "@/lib/review-rating";
import type { Restaurant } from "@/types";

type SearchState = { base: Restaurant[]; owner: string | null; ids: string[]; extra: Restaurant[]; error: string | null };
export function useSearchCatalog(enabled: boolean) {
  const { restaurants: base, currentUserId, isLoading: baseLoading, dataMode, reviews } = useAppContext();
  const [state, setState] = useState<SearchState | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled || baseLoading || dataMode === "mock") return;
    let active = true;
    const client = createSupabaseBrowserClient();
    if (!client) return;
    loadSearchCatalog(client, new Set(base.map(row => row.id))).then(({ ids, extraRows }) => {
      if (active) setState({ base, owner: currentUserId, ids, extra: extraRows.map(mapRestaurant), error: null });
    }).catch(() => {
      if (active) setState({ base, owner: currentUserId, ids: [], extra: [], error: "Não foi possível carregar todos os lugares. Tente novamente." });
    });
    return () => { active = false; };
  }, [enabled, baseLoading, base, currentUserId, dataMode, retry]);
  const current = state?.base === base && state.owner === currentUserId ? state : null;
  const restaurants = useMemo(() => {
    if (dataMode === "mock") return base;
    if (!current) return [];
    const grouped = new Map<string, typeof reviews>();
    for (const review of reviews) { const group = grouped.get(review.restaurantId) ?? []; group.push(review); grouped.set(review.restaurantId, group); }
    const extra = current.extra.map(restaurant => {
      const ownReviews = grouped.get(restaurant.id);
      if (!ownReviews?.length) return restaurant;
      return { ...restaurant, godinnerRating: averageReviewScore(ownReviews) ?? 0, reviewCount: ownReviews.filter(review => getReviewScore(review) !== null).length };
    });
    return searchCatalogView(current.ids, base, extra);
  }, [base, current, dataMode, reviews]);
  return { restaurants, isLoading: enabled && dataMode !== "mock" && (baseLoading || !current), error: current?.error ?? null, retry: () => { setState(null); setRetry(value => value + 1); } };
}
