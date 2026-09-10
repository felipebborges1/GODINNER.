import { Suspense } from "react";
import { MapReviewClient } from "@/components/review/map-review-client";

export default function MapReviewPage() {
  return <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-10 text-sm font-bold text-stone-500">Carregando local…</div>}><MapReviewClient/></Suspense>;
}
