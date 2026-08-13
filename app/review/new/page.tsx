import { Suspense } from "react";
import { NewReviewClient } from "@/components/review/new-review-client";

export default function NewReviewPage() {
  return <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-10 text-sm font-bold text-stone-500">Carregando formulário…</div>}><NewReviewClient/></Suspense>;
}
