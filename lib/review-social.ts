import type { ReviewComment, ReviewSocialSummary } from "@/types";

export const REVIEW_COMMENT_MAX_LENGTH = 500;
export const REVIEW_COMMENTS_PAGE_SIZE = 10;

export function normalizeReviewComment(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateReviewComment(value: string) {
  const body = normalizeReviewComment(value);
  if (!body) return { body, error: "Escreva um comentário para publicar." };
  if (body.length > REVIEW_COMMENT_MAX_LENGTH) return { body, error: `Use no máximo ${REVIEW_COMMENT_MAX_LENGTH} caracteres.` };
  return { body, error: null };
}

export function emptyReviewSocialSummary(): ReviewSocialSummary {
  return { likeCount: 0, commentCount: 0, likedByMe: false };
}

export function toggleReviewLikeSummary(summary: ReviewSocialSummary): ReviewSocialSummary {
  return summary.likedByMe
    ? { ...summary, likedByMe: false, likeCount: Math.max(0, summary.likeCount - 1) }
    : { ...summary, likedByMe: true, likeCount: summary.likeCount + 1 };
}

export function canManageReviewComment(comment: ReviewComment, currentUserId: string | null, isAdmin: boolean) {
  return Boolean(currentUserId && (comment.userId === currentUserId || isAdmin));
}
