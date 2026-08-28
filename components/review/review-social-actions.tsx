"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LoginWall } from "@/components/auth/login-wall";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";
import { trackEvent } from "@/lib/analytics";
import { commentSegments, findMentionUsers, getActiveMention, insertMention } from "@/lib/comment-mentions";
import { canManageReviewComment, emptyReviewSocialSummary, REVIEW_COMMENT_MAX_LENGTH, validateReviewComment } from "@/lib/review-social";
import type { ReviewComment } from "@/types";
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
  const [replyTarget, setReplyTarget] = useState<ReviewComment | null>(null);
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(() => new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const summary = reviewSocial[reviewId] ?? emptyReviewSocialSummary();
  const next = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const activeMention = getActiveMention(comment, cursor);
  const targetCommentId = searchParams.get("review") === reviewId ? searchParams.get("comment") : null;
  const comments = useMemo(() => reviewComments[reviewId] ?? [], [reviewComments, reviewId]);

  useEffect(() => {
    const nextQuery = activeMention?.query ?? "";
    const timeout = window.setTimeout(() => setDebouncedMentionQuery(nextQuery), 250);
    return () => window.clearTimeout(timeout);
  }, [activeMention?.query]);
  useEffect(() => {
    if (!targetCommentId) return;
    const timeout = window.setTimeout(() => {
      setCommentsOpen(true);
      if (!commentsLoaded) {
        setCommentsLoaded(true);
        void loadReviewComments(reviewId, { targetCommentId });
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [commentsLoaded, loadReviewComments, reviewId, targetCommentId]);
  useEffect(() => {
    if (!targetCommentId || !commentsLoaded) return;
    const target = comments.find((item) => item.id === targetCommentId);
    if (!target) return;
    const frame = window.requestAnimationFrame(() => {
      setExpandedRoots((current) => new Set(current).add(target.parentCommentId ?? target.id));
      document.getElementById(`review-comment-${targetCommentId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [comments, commentsLoaded, targetCommentId]);

  const mentionUsers = useMemo(() => {
    if (!activeMention || activeMention.query !== debouncedMentionQuery || !debouncedMentionQuery) return [];
    const followedIds = new Set(follows.filter((follow) => follow.followerId === currentUserId).map((follow) => follow.followingId));
    return findMentionUsers(users, debouncedMentionQuery)
      .sort((left, right) => Number(followedIds.has(right.id)) - Number(followedIds.has(left.id)));
  }, [activeMention, currentUserId, debouncedMentionQuery, follows, users]);
  const roots = useMemo(() => comments.filter((item) => !item.parentCommentId), [comments]);
  const repliesByRoot = useMemo(() => {
    const nextReplies = new Map<string, ReviewComment[]>();
    comments.forEach((item) => {
      if (!item.parentCommentId) return;
      const replies = nextReplies.get(item.parentCommentId) ?? [];
      replies.push(item);
      nextReplies.set(item.parentCommentId, replies);
    });
    return nextReplies;
  }, [comments]);
  const commentsById = useMemo(() => new Map(comments.map((item) => [item.id, item])), [comments]);

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
  const startReply = (target: ReviewComment) => {
    if (!requireLogin()) return;
    setExpandedRoots((current) => new Set(current).add(target.parentCommentId ?? target.id));
    setReplyTarget(target);
    setComment("");
    setCursor(0);
    setCommentError(null);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(0, 0);
    });
  };
  const cancelReply = () => {
    setReplyTarget(null);
    setComment("");
    setCursor(0);
    setCommentError(null);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requireLogin() || isSubmitting) return;
    const validation = validateReviewComment(comment);
    if (validation.error) { setCommentError(validation.error); return; }
    setIsSubmitting(true);
    const created = await createReviewComment(reviewId, validation.body, replyTarget?.id ?? null);
    setIsSubmitting(false);
    if (created) {
      setComment("");
      setCursor(0);
      setCommentError(null);
      setCommentsOpen(true);
      setCommentsLoaded(true);
      if (created.parentCommentId) setExpandedRoots((current) => new Set(current).add(created.parentCommentId!));
      const wasReply = Boolean(replyTarget);
      setReplyTarget(null);
      trackEvent(wasReply ? "comment_reply_created" : "review_comment_created", { reviewId });
    }
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
  const toggleReplies = (rootId: string) => setExpandedRoots((current) => {
    const nextRoots = new Set(current);
    if (nextRoots.has(rootId)) nextRoots.delete(rootId); else nextRoots.add(rootId);
    return nextRoots;
  });
  const renderComment = (item: ReviewComment, isReply = false) => {
    const author = users.find((user) => user.id === item.userId);
    const replyTargetComment = item.replyToCommentId ? commentsById.get(item.replyToCommentId) : null;
    const replyTargetAuthor = replyTargetComment ? users.find((user) => user.id === replyTargetComment.userId) : null;
    return <div id={`review-comment-${item.id}`} key={item.id} className={`flex gap-2 ${isReply ? "ml-2 border-l border-orange-200 py-2 pl-2 sm:ml-3 sm:pl-3" : "rounded-2xl bg-stone-50 p-3"}`}><UserAvatar size={isReply ? "sm" : "md"} src={author?.avatar ?? null} name={author?.name ?? "Usuário"}/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="min-w-0 truncate text-xs font-black">{author?.name ?? "Usuário"}</p>{canManageReviewComment(item, currentUserId, isAdmin) && <button type="button" aria-label="Excluir comentário" onClick={() => void deleteReviewComment(reviewId, item.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-400 hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><Trash2 size={15}/></button>}</div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-stone-700">{isReply && replyTargetAuthor && <><Link href={`/user/${replyTargetAuthor.username}`} className="font-bold text-orange-600 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">@{replyTargetAuthor.username}</Link>{" "}</>}{commentSegments(item.body, item.mentions).map((segment, index) => typeof segment === "string" ? <span key={`${item.id}-text-${index}`}>{segment}</span> : <Link key={`${item.id}-mention-${segment.userId}-${index}`} href={`/user/${segment.username}`} className="font-bold text-orange-600 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">@{segment.username}</Link>)}</p><button type="button" onClick={() => startReply(item)} className="mt-1 min-h-9 rounded-full px-2 text-xs font-black text-orange-600 hover:bg-white hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Responder</button></div></div>;
  };

  return <div className="mt-4 border-t border-stone-100 pt-3">
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => void like()} disabled={isLiking} aria-pressed={summary.likedByMe} aria-label={summary.likedByMe ? "Remover curtida" : "Curtir review"} className={`grid min-h-11 min-w-11 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60 ${summary.likedByMe ? "bg-orange-50 text-orange-600" : "text-stone-600 hover:bg-stone-100"}`}><Heart size={18} fill={summary.likedByMe ? "currentColor" : "none"}/></button>
      {summary.likeCount > 0 && <button type="button" onClick={() => setLikesOpen(true)} aria-label={`Ver ${summary.likeCount} ${summary.likeCount === 1 ? "pessoa que curtiu esta review" : "pessoas que curtiram esta review"}`} className="min-h-11 rounded-full px-2 text-sm font-bold text-stone-600 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">{summary.likeCount} {summary.likeCount === 1 ? "curtida" : "curtidas"}</button>}
      <button type="button" onClick={() => { if (!requireLogin()) return; void openComments(); }} aria-expanded={commentsOpen} aria-controls={`review-comments-${reviewId}`} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-stone-600 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><MessageCircle size={18}/><span>{summary.commentCount ? `${summary.commentCount} ${summary.commentCount === 1 ? "comentário" : "comentários"}` : "Comentar"}</span></button>
    </div>
    {commentsOpen && <div id={`review-comments-${reviewId}`} className="mt-3 space-y-3 pb-20 md:pb-0">
      {roots.map((root) => {
        const replies = repliesByRoot.get(root.id) ?? [];
        const expanded = expandedRoots.has(root.id);
        return <div key={root.id} className="space-y-2">{renderComment(root)}{replies.length > 0 && <button type="button" onClick={() => toggleReplies(root.id)} aria-expanded={expanded} className="min-h-10 px-2 text-sm font-black text-orange-600 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">{expanded ? "Ocultar respostas" : `Ver ${replies.length} ${replies.length === 1 ? "resposta" : "respostas"}`}</button>}{expanded && replies.map((reply) => renderComment(reply, true))}</div>;
      })}
      {reviewCommentsHasMore[reviewId] && <button type="button" onClick={() => void loadReviewComments(reviewId)} className="min-h-10 px-2 text-sm font-black text-orange-600 hover:text-orange-700">Ver mais comentários</button>}
      <form onSubmit={submit} className={`relative flex gap-2 rounded-2xl bg-stone-50 p-2 ${replyTarget ? "mt-9" : ""}`}>{replyTarget && <div className="absolute -top-8 left-0 flex w-full items-center justify-between gap-3"><span className="truncate text-xs font-bold text-stone-600">Respondendo a @{users.find((user) => user.id === replyTarget.userId)?.username ?? "usuário"}</span><button type="button" aria-label="Cancelar resposta" onClick={cancelReply} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><X size={16}/><span className="sr-only">Cancelar</span></button></div>}<label className="sr-only" htmlFor={`review-comment-${reviewId}`}>{replyTarget ? "Adicionar resposta" : "Adicionar comentário"}</label><input ref={inputRef} id={`review-comment-${reviewId}`} value={comment} maxLength={REVIEW_COMMENT_MAX_LENGTH} onSelect={(event) => setCursor(event.currentTarget.selectionStart ?? event.currentTarget.value.length)} onKeyDown={onComposerKeyDown} onChange={(event) => { setComment(event.target.value); setCursor(event.target.selectionStart ?? event.target.value.length); if (commentError) setCommentError(null); }} placeholder={replyTarget ? "Escreva uma resposta" : "Escreva um comentário"} className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm outline-none ring-orange-500 focus:ring-2"/>{mentionUsers.length > 0 && <div role="listbox" aria-label="Sugestões de menção" className="absolute bottom-full left-0 z-20 mb-2 max-h-56 w-[min(100%,22rem)] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1 shadow-xl dark:border-stone-700 dark:bg-stone-900">{mentionUsers.map((user, index) => <button key={user.id} type="button" role="option" aria-selected={activeSuggestion === index} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseMention(user.username)} className={`flex w-full min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${activeSuggestion === index ? "bg-orange-50 dark:bg-orange-950/40" : "hover:bg-stone-50 dark:hover:bg-stone-800"}`}><UserAvatar src={user.avatar} name={user.name}/><span className="min-w-0"><span className="block truncate text-sm font-black">{user.name}</span><span className="block truncate text-xs text-stone-500">@{user.username}</span></span></button>)}</div>}<button type="submit" disabled={isSubmitting} aria-label={replyTarget ? "Publicar resposta" : "Publicar comentário"} className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-stone-950 text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60"><Send size={17}/></button></form>
      {commentError && <p role="alert" className="text-xs font-semibold text-red-600">{commentError}</p>}
    </div>}
    <LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next={next}/>
    <ReviewLikesDialog reviewId={reviewId} open={likesOpen} onClose={() => setLikesOpen(false)}/>
  </div>;
}
