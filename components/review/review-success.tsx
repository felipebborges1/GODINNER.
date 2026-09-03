"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RecommendationUnlockDialog } from "@/components/discover/recommendation-unlock-dialog";
import { trackEvent } from "@/lib/analytics";
import { formatRating, getReviewScore } from "@/lib/review-rating";
import type { Restaurant, Review } from "@/types";

export function ReviewSuccess({ review, restaurant, recommendationsUnlocked = false, claimRecommendationUnlock }: { review: Review; restaurant: Restaurant; recommendationsUnlocked?: boolean; claimRecommendationUnlock?: () => Promise<boolean> }) {
  const router = useRouter();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const claimed = useRef(false);
  const modalTracked = useRef(false);
  useEffect(() => {
    if (!recommendationsUnlocked || !claimRecommendationUnlock || claimed.current) return;
    claimed.current = true;
    void claimRecommendationUnlock().then((didClaim) => {
      if (!didClaim) return;
      setUnlockOpen(true);
      if (!modalTracked.current) {
        modalTracked.current = true;
        trackEvent("recommendation_unlock_modal_viewed", { review_count: 3, maturity_state: "early" });
      }
    });
  }, [claimRecommendationUnlock, recommendationsUnlocked]);
  const viewRecommendations = () => {
    setUnlockOpen(false);
    trackEvent("recommendation_unlock_cta_clicked", { action: "view_recommendations" });
    if (window.location.pathname === "/") {
      document.getElementById("recommendations")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      return;
    }
    router.push("/#recommendations");
  };
  const continueExploring = () => {
    setUnlockOpen(false);
    trackEvent("recommendation_unlock_cta_clicked", { action: "continue_exploring" });
  };
  return <><div className="mx-auto max-w-xl px-4 py-10"><div className="rounded-[2rem] bg-white p-6 text-center shadow-sm ring-1 ring-stone-100"><p className="text-sm font-black text-orange-600">PRONTO</p><h1 className="mt-1 text-3xl font-black">Experiência publicada!</h1><div className="mt-6 flex items-center gap-4 rounded-3xl bg-stone-50 p-4 text-left">{review.photos[0] ? <Image src={review.photos[0].url} alt="Foto da experiência" width={64} height={64} unoptimized className="h-16 w-16 rounded-2xl object-cover"/> : <Image src={restaurant.coverPhoto.url} alt={restaurant.name} width={64} height={64} className="h-16 w-16 rounded-2xl object-cover"/>}<div><b className="block">{restaurant.name}</b><p className="mt-1 text-2xl font-black">★ {formatRating(getReviewScore(review))}</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><Link href={`/restaurant/${restaurant.slug}`} className="rounded-2xl bg-stone-950 py-3 text-sm font-black text-white">Ver restaurante</Link><Link href="/profile" className="rounded-2xl bg-stone-100 py-3 text-sm font-black">Ver no meu perfil</Link></div></div></div><RecommendationUnlockDialog open={unlockOpen} onClose={() => setUnlockOpen(false)} onViewRecommendations={viewRecommendations} onContinueExploring={continueExploring}/></>;
}
