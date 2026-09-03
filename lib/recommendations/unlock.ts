import type { Review } from "@/types";

/**
 * The initial Recommendations milestone deliberately follows the R1 valid-score
 * rule. The server is authoritative for persisted users; this helper supports
 * the local Beta fallback and keeps the transition explicit in the UI layer.
 */
export function isValidRecommendationReview(review: Pick<Review, "rating">) {
  return typeof review.rating === "number" && Number.isFinite(review.rating) && review.rating >= 0 && review.rating <= 5;
}

export function unlocksRecommendations(previousValidReviewCount: number, nextReview: Pick<Review, "rating">) {
  return previousValidReviewCount === 2 && isValidRecommendationReview(nextReview);
}
