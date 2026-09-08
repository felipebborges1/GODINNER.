export type GodinnerRatingSummaryState = "loading" | "unavailable" | "empty" | "rated";

export type GodinnerRatingSummary = {
  state: GodinnerRatingSummaryState;
  reviewCount: number | null;
  reviewCountLabel: string;
};

/**
 * Produces the count copy that belongs to a GODINNER community rating.
 * The caller must pass the same eligible-review aggregate used for the score.
 */
export function getGodinnerRatingSummary(
  reviewCount: number | null | undefined,
  options: { isLoading?: boolean; isUnavailable?: boolean } = {},
): GodinnerRatingSummary {
  if (options.isLoading) {
    return { state: "loading", reviewCount: null, reviewCountLabel: "Carregando avaliações" };
  }

  const validReviewCount = typeof reviewCount === "number" && Number.isSafeInteger(reviewCount) && reviewCount >= 0
    ? reviewCount
    : null;

  if (options.isUnavailable || validReviewCount === null) {
    return { state: "unavailable", reviewCount: null, reviewCountLabel: "Avaliações indisponíveis" };
  }

  if (validReviewCount === 0) {
    return { state: "empty", reviewCount: 0, reviewCountLabel: "Sem avaliações" };
  }

  return {
    state: "rated",
    reviewCount: validReviewCount,
    reviewCountLabel: `${validReviewCount} ${validReviewCount === 1 ? "avaliação" : "avaliações"}`,
  };
}
