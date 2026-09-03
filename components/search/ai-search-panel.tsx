"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { trackEvent } from "@/lib/analytics";
import { normalize } from "@/lib/search";
import type { AiRecommendationResponse, AiSearchPosition } from "@/lib/ai/types";
import type { Restaurant } from "@/types";

const suggestions = ["Italiano em BH", "Japonês perto de mim", "Até R$100", "Jantar em Nova Lima"];

function queryMayNeedLocation(query: string) {
  const text = normalize(query);
  return text.includes("perto de mim") || text.includes("proximo de mim") || text.includes("perto") || text.includes("proximo");
}

function requestPosition() {
  return new Promise<AiSearchPosition | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => resolve(null),
      { timeout: 8_000, maximumAge: 300_000 },
    );
  });
}

export function AiSearchPanel({ restaurants }: { restaurants: Restaurant[] }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AiRecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const submit = async (nextQuery = query) => {
    const trimmed = nextQuery.trim();
    if (!trimmed || isSubmitting) return;
    setQuery(trimmed);
    setSubmitting(true);
    setError(null);
    setResult(null);
    trackEvent("ai_search_started");
    try {
      const position = queryMayNeedLocation(trimmed) ? await requestPosition() : null;
      const response = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, position }),
      });
      const payload = await response.json().catch(() => null) as AiRecommendationResponse | { error?: string } | null;
      if (!response.ok || !payload || !("recommendations" in payload)) throw new Error((payload && "error" in payload && payload.error) || "Não foi possível buscar agora.");
      setResult(payload);
      trackEvent(payload.recommendations.length ? "ai_search_completed" : "ai_search_no_results", { resultCount: payload.recommendations.length });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível buscar agora.");
      trackEvent("ai_search_failed");
    } finally {
      setSubmitting(false);
    }
  };

  const resultRows = result?.recommendations.map((recommendation) => ({ recommendation, restaurant: restaurants.find((restaurant) => restaurant.id === recommendation.restaurantId) })).filter((item): item is { recommendation: AiRecommendationResponse["recommendations"][number]; restaurant: Restaurant } => Boolean(item.restaurant)) ?? [];

  return <section className="rounded-3xl border border-orange-100 bg-orange-50/70 p-4 sm:p-5" aria-labelledby="ai-search-title">
    <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-orange-500 text-white"><Sparkles size={16}/></span><div><h2 id="ai-search-title" className="font-black text-stone-900">Pergunte ao GODINNER</h2><p className="text-xs text-stone-600">Interpretamos seu pedido e pesquisamos somente no nosso catálogo.</p></div></div>
    <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={280} placeholder="Ex.: italiano até R$100 no Buritis" className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none ring-orange-400 focus:ring-2" aria-label="Pergunte ao GODINNER" />
      <button type="submit" disabled={!query.trim() || isSubmitting} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? <LoaderCircle className="animate-spin" size={17}/> : "Encontrar"}</button>
    </form>
    <div className="mt-3 flex touch-auto gap-2 overflow-x-auto pb-1">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void submit(suggestion)} disabled={isSubmitting} className="shrink-0 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 disabled:opacity-50">{suggestion}</button>)}</div>
    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
    {result && <div className="mt-4">
      {result.notices.map((notice) => <p key={notice} className="mb-2 text-xs leading-5 text-stone-600">{notice}</p>)}
      {!result.recommendations.length ? <p className="rounded-xl bg-white px-3 py-4 text-sm font-semibold text-stone-700">Não encontramos uma combinação exata.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{resultRows.map(({ recommendation, restaurant }) => <div key={restaurant.id}><RestaurantCard restaurant={restaurant} distance={recommendation.distanceKm === null ? undefined : `${recommendation.distanceKm.toFixed(1).replace(".", ",")} km`} onRestaurantClick={() => trackEvent("ai_recommendation_clicked", { restaurantId: restaurant.id })}/><p className="mt-2 px-1 text-xs text-stone-600"><span className="font-bold">Por que recomendamos:</span> {recommendation.reasons.join(" · ")}</p></div>)}</div>}
    </div>}
  </section>;
}
