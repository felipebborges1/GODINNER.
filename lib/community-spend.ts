import type { Review } from "@/types";

export type CommunitySpend = {
  average: number;
  experienceCount: number;
};

type SpendReview = Pick<Review, "amountPerPerson">;

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

  for (const review of reviews) {
    if (!isValidSpend(review.amountPerPerson)) continue;
    total += review.amountPerPerson;
    experienceCount += 1;
  }

  return experienceCount ? { average: total / experienceCount, experienceCount } : null;
}

export function formatCommunitySpend(value: number) {
  return `R$${Math.round(value).toLocaleString("pt-BR")}`;
}

export function formatCommunityExperienceCount(count: number) {
  return `${count} ${count === 1 ? "experiência" : "experiências"}`;
}
