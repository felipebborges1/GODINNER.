import type { Review } from "@/types";

export function dedupeReviewsById(reviews: readonly Review[]): Review[] {
  const reviewIds = new Set<string>();
  return reviews.filter((review) => {
    if (reviewIds.has(review.id)) return false;
    reviewIds.add(review.id);
    return true;
  });
}

export function orderReviewsForFeed(reviews: readonly Review[]): Review[] {
  return [...reviews].sort((left, right) => {
    const createdAtOrder = right.createdAt.localeCompare(left.createdAt);
    return createdAtOrder !== 0 ? createdAtOrder : right.id.localeCompare(left.id);
  });
}

export function nextFeedVisibleCount(visibleCount: number, totalCount: number, pageSize: number) {
  return Math.min(totalCount, visibleCount + pageSize);
}
