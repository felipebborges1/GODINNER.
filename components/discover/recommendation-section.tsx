"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { trackEvent } from "@/lib/analytics";
import type { RecommendationResult } from "@/lib/recommendations/engine";

function unlockCopy(reviewCount: number) {
  if (reviewCount === 0) return { message: "Suas recomendações começam com suas experiências.", detail: "Avalie 3 lugares para começarmos a entender seus gostos.", cta: "Avaliar um lugar" };
  if (reviewCount === 1) return { message: "Mais 2 experiências e suas recomendações começam a ganhar forma.", detail: "", cta: "Avaliar outro lugar" };
  return { message: "Falta só 1 experiência para desbloquear suas recomendações.", detail: "", cta: "Avaliar outro lugar" };
}

export function RecommendationSection({ result }: { result: RecommendationResult }) {
  const trackedSignature = useRef<string | null>(null);
  const { maturity, profile, recommendations } = result;
  const reviewCount = profile.validReviewCount;
  const remainingReviews = Math.max(0, 3 - reviewCount);
  const signature = useMemo(() => `${maturity}:${recommendations.map((recommendation) => recommendation.restaurant.id).join(",")}`, [maturity, recommendations]);

  useEffect(() => {
    if (trackedSignature.current === signature) return;
    trackedSignature.current = signature;
    trackEvent("recommendation_section_viewed", { maturity_state: maturity, recommendation_count: recommendations.length });
    if (maturity === "locked") {
      trackEvent("recommendation_unlock_progress_viewed", { review_count: reviewCount, remaining_reviews: remainingReviews });
      return;
    }
    recommendations.forEach((recommendation, index) => {
      trackEvent("recommendation_impression", {
        restaurant_id: recommendation.restaurant.id,
        position: index + 1,
        reason_type: recommendation.reasonType,
        maturity_state: maturity,
      });
    });
  }, [maturity, recommendations, remainingReviews, reviewCount, signature]);

  if (maturity === "locked") {
    const copy = unlockCopy(reviewCount);
    return <section aria-labelledby="recommendations-heading" className="mt-10 rounded-3xl border border-stone-200 bg-stone-50 p-5 sm:p-6">
      <div className="flex items-start gap-3"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-stone-200 text-stone-700"><LockKeyhole size={19}/></span><div><h2 id="recommendations-heading" className="text-xl font-black tracking-tight sm:text-2xl">Recomendados para você</h2><p className="mt-2 text-sm font-semibold leading-6 text-stone-800">{copy.message}</p>{copy.detail && <p className="mt-1 text-sm leading-6 text-stone-600">{copy.detail}</p>}</div></div>
      <div className="mt-5 max-w-md" aria-describedby="recommendation-progress-label"><div className="flex items-center justify-between gap-3 text-sm"><span id="recommendation-progress-label" className="font-bold text-stone-800">{reviewCount} de 3 experiências</span><span className="text-stone-500">{remainingReviews} restante{remainingReviews === 1 ? "" : "s"}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={reviewCount} aria-label={`${reviewCount} de 3 experiências para desbloquear recomendações`}><div className="h-full rounded-full bg-orange-500 transition-[width]" style={{ width: `${(reviewCount / 3) * 100}%` }}/></div></div>
      <Link href="/review/new" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-orange-500 px-4 text-sm font-black text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">{copy.cta}</Link>
    </section>;
  }

  if (!recommendations.length) {
    return <section aria-labelledby="recommendations-heading" className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center"><h2 id="recommendations-heading" className="text-xl font-black tracking-tight sm:text-2xl">Recomendados para você</h2><p className="mt-3 text-sm leading-6 text-stone-600">Estamos preparando novas recomendações para você.</p><Link href="/search" className="mt-4 inline-flex min-h-11 items-center font-black text-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">Continuar explorando</Link></section>;
  }

  return <section aria-labelledby="recommendations-heading" className="mt-10"><div className="mb-4"><h2 id="recommendations-heading" className="text-xl font-black tracking-tight sm:text-2xl">Recomendados para você</h2><p className="mt-1 text-sm leading-6 text-stone-600">Escolhidos com base no seu gosto e na sua rede.</p></div><div aria-label="Carrossel de recomendações" className="-mx-4 flex touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible">{recommendations.map((recommendation, index) => <div key={recommendation.restaurant.id} className="w-[82vw] min-w-0 max-w-80 shrink-0 snap-start sm:w-72 lg:w-auto lg:max-w-none"><RestaurantCard restaurant={recommendation.restaurant} imagePriority={index === 0} className="w-full" onRestaurantClick={() => trackEvent("recommendation_clicked", { restaurant_id: recommendation.restaurant.id, position: index + 1, reason_type: recommendation.reasonType, maturity_state: maturity })}/><p data-recommendation-reason className="px-1 pt-3 text-sm leading-5 text-stone-600">{recommendation.reason}</p></div>)}</div></section>;
}
