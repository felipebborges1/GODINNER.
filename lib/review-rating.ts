import type { Review } from "@/types";

export type DimensionAverages = {
  food: number | null;
  service: number | null;
  ambience: number | null;
};

export function isDimensionRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function getDimensionalReviewScore(foodRating: unknown, serviceRating: unknown, ambienceRating: unknown) {
  if (!isDimensionRating(foodRating) || !isDimensionRating(serviceRating) || !isDimensionRating(ambienceRating)) return null;
  return (foodRating + serviceRating + ambienceRating) / 3;
}

/** A single, intentionally simple score policy for the Beta period. */
export function getReviewScore(review: Pick<Review, "rating" | "legacyRating" | "ratingMethod" | "foodRating" | "serviceRating" | "ambienceRating">) {
  if (review.ratingMethod === "dimensions") {
    return getDimensionalReviewScore(review.foodRating, review.serviceRating, review.ambienceRating);
  }
  if (typeof review.legacyRating === "number" && Number.isFinite(review.legacyRating)) return review.legacyRating / 2;
  return typeof review.rating === "number" && Number.isFinite(review.rating) ? review.rating : null;
}

export function averageReviewScore(reviews: Array<Pick<Review, "rating" | "legacyRating" | "ratingMethod" | "foodRating" | "serviceRating" | "ambienceRating">>) {
  const scores = reviews.map(getReviewScore).filter((score): score is number => score !== null);
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
}

function average(values: Array<number | null>) {
  const eligible = values.filter((value): value is number => value !== null);
  return eligible.length ? eligible.reduce((sum, value) => sum + value, 0) / eligible.length : null;
}

export function getDimensionAverages(reviews: Review[]): DimensionAverages {
  return {
    food: average(reviews.map((review) => review.ratingMethod === "dimensions" && isDimensionRating(review.foodRating) ? review.foodRating : null)),
    service: average(reviews.map((review) => review.ratingMethod === "dimensions" && isDimensionRating(review.serviceRating) ? review.serviceRating : null)),
    ambience: average(reviews.map((review) => review.ratingMethod === "dimensions" && isDimensionRating(review.ambienceRating) ? review.ambienceRating : null)),
  };
}

export function formatRating(score: number | null | undefined) {
  if (score === null || score === undefined || !Number.isFinite(score)) return "—";
  return (Math.round((score + Number.EPSILON) * 10) / 10).toFixed(1).replace(".", ",");
}

export function normalizeRatingFilter(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return undefined;
  return parsed > 5 ? parsed / 2 : parsed;
}
