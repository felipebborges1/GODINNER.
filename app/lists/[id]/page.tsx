import { Suspense } from "react";
import { ListDetailClient } from "@/components/lists/list-detail-client";

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-sm font-bold text-stone-500">Carregando lista…</div>}><ListDetailClient id={id}/></Suspense>;
}
