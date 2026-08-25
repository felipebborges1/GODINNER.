"use client";

import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ReviewEditForm } from "@/components/review/review-edit-form";
import { useAppContext } from "@/hooks/use-app-context";
import { trackEvent } from "@/lib/analytics";
import type { Restaurant, Review } from "@/types";

export function ReviewOwnerActions({ review, restaurant }: { review: Review; restaurant?: Restaurant }) {
  const { currentUserId, isAdmin, deleteReview } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canManage = Boolean(restaurant && currentUserId && (review.userId === currentUserId || isAdmin));
  if (!canManage || !restaurant) return null;
  const remove = async () => {
    setDeleting(true);
    const result = await deleteReview(review.id);
    setDeleting(false);
    if (result.ok) trackEvent("review_deleted", { reviewId: review.id, restaurantId: review.restaurantId, storage_cleanup_failed: result.cleanupFailed ?? false });
    if (result.ok) setConfirming(false);
  };

  return <><div className="relative"><button type="button" aria-label="Abrir opções da experiência" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="grid min-h-11 min-w-11 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><MoreHorizontal size={20}/></button>{menuOpen && <div role="menu" className="absolute right-0 top-12 z-10 min-w-36 rounded-2xl bg-white p-1 shadow-xl ring-1 ring-black/5"><button role="menuitem" type="button" onClick={() => { setMenuOpen(false); setEditing(true); }} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold hover:bg-stone-100"><Pencil size={16}/>Editar</button><button role="menuitem" type="button" onClick={() => { setMenuOpen(false); setConfirming(true); }} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 size={16}/>Excluir</button></div>}</div>{editing && <div role="dialog" aria-modal="true" aria-labelledby={`edit-review-title-${review.id}`} className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-6"><div className="mx-auto my-4 max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:my-10 sm:p-7"><div className="mb-5 flex justify-end"><button type="button" aria-label="Fechar edição" onClick={() => setEditing(false)} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-stone-100"><X size={20}/></button></div><div id={`edit-review-title-${review.id}`} className="sr-only">Editar experiência</div><ReviewEditForm review={review} restaurant={restaurant} onComplete={() => setEditing(false)} onCancel={() => setEditing(false)}/></div></div>}{confirming && <div role="dialog" aria-modal="true" aria-labelledby={`delete-review-title-${review.id}`} className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 id={`delete-review-title-${review.id}`} className="text-xl font-black">Excluir esta experiência?</h2><p className="mt-3 text-sm leading-6 text-stone-600">Essa ação removerá sua avaliação, fotos e interações associadas.</p><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={deleting} onClick={() => setConfirming(false)} className="min-h-11 rounded-xl px-4 text-sm font-black text-stone-600 hover:bg-stone-100">Cancelar</button><button type="button" disabled={deleting} onClick={() => void remove()} className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-black text-white disabled:opacity-60">{deleting ? "Excluindo…" : "Excluir"}</button></div></div></div>}</>;
}
