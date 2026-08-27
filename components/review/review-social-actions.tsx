"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LoginWall } from "@/components/auth/login-wall";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";
import { trackEvent } from "@/lib/analytics";
import { commentSegments, findMentionUsers, getActiveMention, insertMention } from "@/lib/comment-mentions";
import { canManageReviewComment, emptyReviewSocialSummary, REVIEW_COMMENT_MAX_LENGTH, validateReviewComment } from "@/lib/review-social";
import { ReviewLikesDialog } from "./review-likes-dialog";

export function ReviewSocialActions({ reviewId }: { reviewId: string }) {
  const { currentUserId, isAdmin, users, follows, reviewSocial, reviewComments, reviewCommentsHasMore, toggleReviewLike, loadReviewComments, createReviewComment, deleteReviewComment } = useAppContext();
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
  const [cursor, setCursor] = useState(0);
  const [debouncedMentionQuery, setDebouncedMentionQuery] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const summary = reviewSocial[reviewId] ?? emptyReviewSocialSummary();
  const next = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const activeMention = getActiveMention(comment, cursor);
  const targetCommentId = searchParams.get("review") === reviewId ? searchParams.get("comment") : null;

  useEffect(() => {
    const nextQuery = activeMention?.query ?? "";
    const timeout = window.setTimeout(() => setDebouncedMentionQuery(nextQuery), 250);
    return () => window.clearTimeout(timeout);
  }, [activeMention?.query]);
  useEffect(() => setActiveSuggestion(0), [debouncedMentionQuery]);
  useEffect(() => {
    if (!targetCommentId) return;
    setCommentsOpen(true);
    if (!commentsLoaded) {
      setCommentsLoaded(true);
      void loadReviewComments(reviewId);
    }
  }, [commentsLoaded, loadReviewComments, reviewId, targetCommentId]);

  const mentionUsers = useMemo(() => {
    if (!activeMention || activeMention.query !== debouncedMentionQuery || !debouncedMentionQuery) return [];
    const followedIds = new Set(follows.filter((follow) => follow.followerId === currentUserId).map((follow) => follow.followingId));
    return findMentionUsers(users, debouncedMentionQuery)
      .sort((left, right) => Number(followedIds.has(right.id)) - Number(followedIds.has(left.id)));
  }, [activeMention, currentUserId, debouncedMentionQuery, follows, users]);

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
  const chooseMention = (username: string) => {
    if (!activeMention) return;
    const nextValue = insertMention(comment, activeMention, username);
    if (nextValue.length > REVIEW_COMMENT_MAX_LENGTH) {
      setCommentError(`Use no máximo ${REVIEW_COMMENT_MAX_LENGTH} caracteres.`);
      return;
    }
    const nextCursor = activeMention.start + username.length + 1 + (nextValue.charAt(activeMention.start + username.length + 1) === " " ? 1 : 0);
    setComment(nextValue);
    setCursor(nextCursor);
    setDebouncedMentionQuery("");
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };
  const onComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!mentionUsers.length || event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveSuggestion((current) => (current + 1) % mentionUsers.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveSuggestion((current) => (current - 1 + mentionUsers.length) % mentionUsers.length); }
    if (event.key === "Enter") { event.preventDefault(); chooseMention(mentionUsers[activeSuggestion]?.username ?? mentionUsers[0].username); }
    if (event.key === "Escape") { event.preventDefault(); setDebouncedMentionQuery(""); }
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
        return <div id={`review-comment-${item.id}`} key={item.id} className="flex gap-2 rounded-2xl bg-stone-50 p-3"><UserAvatar src={author?.avatar ?? null} name={author?.name ?? "Usuário"}/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-xs font-black">{author?.name ?? "Usuário"}</p>{canManageReviewComment(item, currentUserId, isAdmin) && <button type="button" aria-label="Excluir comentário" onClick={() => void deleteReviewComment(reviewId, item.id)} className="grid h-8 w-8 place-items-center rounded-full text-stone-400 hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><Trash2 size={15}/></button>}</div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-stone-700">{commentSegments(item.body, item.mentions).map((segment, index) => typeof segment === "string" ? <span key={`${item.id}-text-${index}`}>{segment}</span> : <Link key={`${item.id}-mention-${segment.userId}-${index}`} href={`/user/${segment.username}`} className="font-bold text-orange-600 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">@{segment.username}</Link>)}</p></div></div>;
      })}
      {reviewCommentsHasMore[reviewId] && <button type="button" onClick={() => void loadReviewComments(reviewId)} className="min-h-10 px-2 text-sm font-black text-orange-600 hover:text-orange-700">Ver mais comentários</button>}
      <form onSubmit={submit} className="relative flex gap-2"><label className="sr-only" htmlFor={`review-comment-${reviewId}`}>Adicionar comentário</label><input ref={inputRef} id={`review-comment-${reviewId}`} value={comment} maxLength={REVIEW_COMMENT_MAX_LENGTH} onSelect={(event) => setCursor(event.currentTarget.selectionStart ?? event.currentTarget.value.length)} onKeyDown={onComposerKeyDown} onChange={(event) => { setComment(event.target.value); setCursor(event.target.selectionStart ?? event.target.value.length); if (commentError) setCommentError(null); }} placeholder="Escreva um comentário" className="min-w-0 flex-1 rounded-xl bg-stone-100 px-3 py-2 text-sm outline-none ring-orange-500 focus:ring-2"/>{mentionUsers.length > 0 && <div role="listbox" aria-label="Sugestões de menção" className="absolute bottom-full left-0 z-20 mb-2 max-h-56 w-[min(100%,22rem)] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1 shadow-xl dark:border-stone-700 dark:bg-stone-900">{mentionUsers.map((user, index) => <button key={user.id} type="button" role="option" aria-selected={activeSuggestion === index} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseMention(user.username)} className={`flex w-full min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${activeSuggestion === index ? "bg-orange-50 dark:bg-orange-950/40" : "hover:bg-stone-50 dark:hover:bg-stone-800"}`}><UserAvatar src={user.avatar} name={user.name}/><span className="min-w-0"><span className="block truncate text-sm font-black">{user.name}</span><span className="block truncate text-xs text-stone-500">@{user.username}</span></span></button>)}</div>}<button type="submit" disabled={isSubmitting} aria-label="Publicar comentário" className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-stone-950 text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60"><Send size={17}/></button></form>
      {commentError && <p role="alert" className="text-xs font-semibold text-red-600">{commentError}</p>}
    </div>}
    <LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next={next}/>
    <ReviewLikesDialog reviewId={reviewId} open={likesOpen} onClose={() => setLikesOpen(false)}/>
  </div>;
}
