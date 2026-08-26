"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";

export function ReviewLikesDialog({ reviewId, open, onClose }: { reviewId: string; open: boolean; onClose: () => void }) {
  const { currentUserId, follows, reviewLikes, reviewLikesError, reviewLikesHasMore, reviewLikesLoading, loadReviewLikes, toggleFollow } = useAppContext();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const loadedReviewRef = useRef<string | null>(null);
  const likes = reviewLikes[reviewId] ?? [];
  const isLoading = reviewLikesLoading[reviewId];
  const hasError = reviewLikesError[reviewId];

  useEffect(() => {
    if (!open) {
      loadedReviewRef.current = null;
      return;
    }
    if (loadedReviewRef.current === reviewId) return;
    loadedReviewRef.current = reviewId;
    void loadReviewLikes(reviewId, { reset: true });
  }, [loadReviewLikes, open, reviewId]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby={`review-likes-title-${reviewId}`} onMouseDown={onClose}>
    <section ref={dialogRef} className="flex max-h-[min(82dvh,42rem)] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <h2 id={`review-likes-title-${reviewId}`} className="text-lg font-black">Curtidas</h2>
        <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Fechar curtidas" className="grid h-11 w-11 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><X size={20}/></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {isLoading && likes.length === 0 && <div className="space-y-3" aria-label="Carregando curtidas"><div className="h-14 animate-pulse rounded-2xl bg-stone-100"/><div className="h-14 animate-pulse rounded-2xl bg-stone-100"/></div>}
        {hasError && <div className="py-8 text-center"><p className="text-sm text-stone-600">Não foi possível carregar as curtidas.</p><button type="button" onClick={() => void loadReviewLikes(reviewId, { reset: true })} className="mt-3 min-h-11 rounded-full px-4 text-sm font-black text-orange-600 transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Tentar novamente</button></div>}
        {!isLoading && !hasError && likes.length === 0 && <p className="py-8 text-center text-sm text-stone-500">Ainda não há curtidas.</p>}
        <ul className="space-y-2">
          {likes.map((user) => {
            const isMe = user.userId === currentUserId;
            const isFollowing = Boolean(currentUserId && follows.some((follow) => follow.followerId === currentUserId && follow.followingId === user.userId));
            return <li key={user.userId} className="flex min-h-14 items-center gap-3 rounded-2xl px-1 py-2">
              <Link href={`/user/${user.username}`} onClick={onClose} aria-label={`Ver perfil de ${user.name}`} className="shrink-0"><UserAvatar src={user.avatar} name={user.name}/></Link>
              <Link href={`/user/${user.username}`} onClick={onClose} className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><p className="truncate text-sm font-black text-stone-950">{user.name}</p><p className="truncate text-xs text-stone-500">@{user.username}</p></Link>
              {!isMe && currentUserId && <button type="button" onClick={() => void toggleFollow(user.userId)} className={`min-h-10 rounded-full px-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isFollowing ? "bg-stone-100 text-stone-800 hover:bg-stone-200" : "bg-stone-950 text-white hover:bg-stone-800"}`}>{isFollowing ? "Seguindo" : "Seguir"}</button>}
            </li>;
          })}
        </ul>
        {reviewLikesHasMore[reviewId] && <button type="button" disabled={isLoading} onClick={() => void loadReviewLikes(reviewId)} className="mx-auto mt-3 block min-h-11 rounded-full px-4 text-sm font-black text-orange-600 transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60">{isLoading ? "Carregando…" : "Carregar mais"}</button>}
      </div>
    </section>
  </div>;
}
