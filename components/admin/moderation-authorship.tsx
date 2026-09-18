"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Author =
  | { state: "available"; id: string; name: string; username: string }
  | { state: "missing_link" }
  | { state: "unavailable"; id: string }
  | { state: "error"; id: string };

type ModerationAudit = {
  restaurant: { submittedAt: string | null; author: Author };
  reviews: Array<{ id: string; author: Author; createdAt: string; rating: number; ratingMethod: "legacy" | "dimensions"; comment: string; restaurantStatus: "published" | "pending_review" | "rejected" }>;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "Data não registrada";
}

function AuthorIdentity({ author }: { author: Author }) {
  if (author.state === "missing_link") return <span>Autoria não registrada</span>;
  if (author.state === "unavailable") return <span>Perfil indisponível</span>;
  if (author.state === "error") return <span>Não foi possível carregar o autor</span>;
  return <span><Link href={`/user/${author.username}`} className="font-bold text-orange-700 hover:underline">{author.name}</Link><span className="ml-1 text-stone-500">@{author.username}</span></span>;
}

async function fetchModerationAudit(restaurantId: string) {
  const response = await fetch(`/api/admin/restaurants/${restaurantId}/moderation-audit`, { cache: "no-store" });
  if (!response.ok) throw new Error("moderation_audit_failed");
  return response.json() as Promise<ModerationAudit>;
}

export function ModerationAuthorship({ restaurantId }: { restaurantId: string }) {
  const [audit, setAudit] = useState<ModerationAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const retry = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setAudit(await fetchModerationAudit(restaurantId));
    } catch {
      setAudit(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);
  useEffect(() => {
    let active = true;
    void fetchModerationAudit(restaurantId)
      .then((nextAudit) => { if (active) setAudit(nextAudit); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [restaurantId]);

  if (loading) return <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">Carregando autor…</div>;
  if (error || !audit) return <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><p>Não foi possível carregar a autoria para moderação.</p><button onClick={() => void retry()} className="mt-2 font-bold underline">Tentar novamente</button></div>;

  return <div className="mt-4 space-y-5">
    <div className="rounded-2xl bg-stone-50 p-4 text-sm">
      <p className="text-xs font-black uppercase text-stone-500">Restaurante sugerido por</p>
      <p className="mt-1"><AuthorIdentity author={audit.restaurant.author}/></p>
      <p className="mt-1 text-xs text-stone-500">Enviado em {formatDate(audit.restaurant.submittedAt)}</p>
    </div>
    <div>
      <p className="text-xs font-black uppercase text-stone-500">Reviews relacionadas</p>
      {!audit.reviews.length ? <p className="mt-2 text-sm text-stone-500">Nenhuma review relacionada.</p> : <div className="mt-3 space-y-3">{audit.reviews.map((review) => <article key={review.id} className="rounded-2xl border border-stone-200 p-4 text-sm">
        <p className="text-xs font-black uppercase text-stone-500">Review escrita por</p>
        <p className="mt-1"><AuthorIdentity author={review.author}/></p>
        <p className="mt-1 text-xs text-stone-500">{formatDate(review.createdAt)} · Nota {review.rating.toFixed(1)}</p>
        <p className="mt-1 text-xs text-stone-500">Status: {review.restaurantStatus === "pending_review" ? "associada a restaurante pendente" : review.restaurantStatus === "published" ? "associada a restaurante publicado" : "associada a restaurante rejeitado"}</p>
        <p className="mt-3 whitespace-pre-wrap text-stone-700">{review.comment || "Sem comentário."}</p>
      </article>)}</div>}
    </div>
  </div>;
}
