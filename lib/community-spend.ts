import { formatCurrency } from "@/lib/currency";
import type { Review } from "@/types";

export type CommunitySpend = {
  average: number;
  experienceCount: number;
  currency: string | null;
};

type SpendReview = Pick<Review, "amountPerPerson" | "currency">;

function isValidSpend(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Beta decision: use the simple arithmetic mean of every valid reported spend.
 * This intentionally keeps outliers until the product has enough real data for
 * a more robust statistical model.
 */
export function calculateCommunitySpend(reviews: Iterable<SpendReview>): CommunitySpend | null {
  let total = 0;
  let experienceCount = 0;
  let currency: string | null | undefined;

  for (const review of reviews) {
    if (!isValidSpend(review.amountPerPerson)) continue;
    const reviewCurrency = review.currency ?? null;
    if (currency !== undefined && currency !== reviewCurrency) return null;
    currency = reviewCurrency;
    total += review.amountPerPerson;
    experienceCount += 1;
  }

  return experienceCount ? { average: total / experienceCount, experienceCount, currency: currency ?? null } : null;
}

export function formatCommunitySpend(value: number, currency: string | null) {
  return formatCurrency(Math.round(value), currency);
}

export function formatCommunityExperienceCount(count: number) {
  return `${count} ${count === 1 ? "experiência" : "experiências"}`;
}
