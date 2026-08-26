"use client";

import { FormEvent, useState } from "react";
import { Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoginWall } from "@/components/auth/login-wall";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";
import { trackEvent } from "@/lib/analytics";
import { canManageReviewComment, emptyReviewSocialSummary, REVIEW_COMMENT_MAX_LENGTH, validateReviewComment } from "@/lib/review-social";
import { ReviewLikesDialog } from "./review-likes-dialog";

export function ReviewSocialActions({ reviewId }: { reviewId: string }) {
  const { currentUserId, isAdmin, users, reviewSocial, reviewComments, reviewCommentsHasMore, toggleReviewLike, loadReviewComments, createReviewComment, deleteReviewComment } = useAppContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loginOpen, setLoginOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const summary = reviewSocial[reviewId] ?? emptyReviewSocialSummary();
  const next = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const requireLogin = () => {
    if (currentUserId) return true;
    setLoginOpen(true);
    return false;
  };
  const openComments = async () => {
    setCommentsOpen((open) => !open);
    if (!commentsLoaded) {
      setCommentsLoaded(true);
      await loadReviewComments(reviewId);
    }
  };
  const like = async () => {
    if (!requireLogin() || isLiking) return;
    const wasLiked = summary.likedByMe;
    setIsLiking(true);
    const isLiked = await toggleReviewLike(reviewId);
    setIsLiking(false);
    if (isLiked !== wasLiked) trackEvent(isLiked ? "review_liked" : "review_unliked", { reviewId });
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requireLogin() || isSubmitting) return;
    const validation = validateReviewComment(comment);
    if (validation.error) { setCommentError(validation.error); return; }
    setIsSubmitting(true);
    const created = await createReviewComment(reviewId, validation.body);
    setIsSubmitting(false);
    if (created) { setComment(""); setCommentError(null); setCommentsOpen(true); setCommentsLoaded(true); trackEvent("review_comment_created", { reviewId }); }
  };

  return <div className="mt-4 border-t border-stone-100 pt-3">
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => void like()} disabled={isLiking} aria-pressed={summary.likedByMe} aria-label={summary.likedByMe ? "Remover curtida" : "Curtir review"} className={`grid min-h-11 min-w-11 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60 ${summary.likedByMe ? "bg-orange-50 text-orange-600" : "text-stone-600 hover:bg-stone-100"}`}><Heart size={18} fill={summary.likedByMe ? "currentColor" : "none"}/></button>
      {summary.likeCount > 0 && <button type="button" onClick={() => setLikesOpen(true)} aria-label={`Ver ${summary.likeCount} ${summary.likeCount === 1 ? "pessoa que curtiu esta review" : "pessoas que curtiram esta review"}`} className="min-h-11 rounded-full px-2 text-sm font-bold text-stone-600 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">{summary.likeCount} {summary.likeCount === 1 ? "curtida" : "curtidas"}</button>}
      <button type="button" onClick={() => { if (!requireLogin()) return; void openComments(); }} aria-expanded={commentsOpen} aria-controls={`review-comments-${reviewId}`} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-stone-600 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><MessageCircle size={18}/><span>{summary.commentCount ? `${summary.commentCount} ${summary.commentCount === 1 ? "comentário" : "comentários"}` : "Comentar"}</span></button>
    </div>
    {commentsOpen && <div id={`review-comments-${reviewId}`} className="mt-3 space-y-3">
      {(reviewComments[reviewId] ?? []).map((item) => {
        const author = users.find((user) => user.id === item.userId);
        return <div key={item.id} className="flex gap-2 rounded-2xl bg-stone-50 p-3"><UserAvatar src={author?.avatar ?? null} name={author?.name ?? "Usuário"}/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-xs font-black">{author?.name ?? "Usuário"}</p>{canManageReviewComment(item, currentUserId, isAdmin) && <button type="button" aria-label="Excluir comentário" onClick={() => void deleteReviewComment(reviewId, item.id)} className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><Trash2 size={15}/></button>}</div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-stone-700">{item.body}</p></div></div>;
      })}
      {reviewCommentsHasMore[reviewId] && <button type="button" onClick={() => void loadReviewComments(reviewId)} className="min-h-10 px-2 text-sm font-black text-orange-600 hover:text-orange-700">Ver mais comentários</button>}
      <form onSubmit={submit} className="flex gap-2"><label className="sr-only" htmlFor={`review-comment-${reviewId}`}>Adicionar comentário</label><input id={`review-comment-${reviewId}`} value={comment} maxLength={REVIEW_COMMENT_MAX_LENGTH} onChange={(event) => { setComment(event.target.value); if (commentError) setCommentError(null); }} placeholder="Escreva um comentário" className="min-w-0 flex-1 rounded-xl bg-stone-100 px-3 py-2 text-sm outline-none ring-orange-500 focus:ring-2"/><button type="submit" disabled={isSubmitting} aria-label="Publicar comentário" className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-stone-950 text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60"><Send size={17}/></button></form>
      {commentError && <p role="alert" className="text-xs font-semibold text-red-600">{commentError}</p>}
    </div>}
    <LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next={next}/>
    <ReviewLikesDialog reviewId={reviewId} open={likesOpen} onClose={() => setLikesOpen(false)}/>
  </div>;
}
