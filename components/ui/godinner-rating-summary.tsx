import { Star } from "lucide-react";
import { getGodinnerRatingSummary } from "@/lib/godinner-rating-summary";
import { formatRating } from "@/lib/review-rating";

type GodinnerRatingSummaryProps = {
  rating: number | null | undefined;
  reviewCount: number | null | undefined;
  isLoading?: boolean;
  isUnavailable?: boolean;
  variant?: "badge" | "summary";
};

export function GodinnerRatingSummary({
  rating,
  reviewCount,
  isLoading = false,
  isUnavailable = false,
  variant = "badge",
}: GodinnerRatingSummaryProps) {
  const summary = getGodinnerRatingSummary(reviewCount, { isLoading, isUnavailable });
  const hasRating = summary.state === "rated" && typeof rating === "number" && Number.isFinite(rating);
  const text = hasRating
    ? `${formatRating(rating)} · ${summary.reviewCountLabel}`
    : summary.reviewCountLabel;
  const accessibleLabel = hasRating
    ? `Nota GODINNER ${formatRating(rating)} de 5, baseada em ${summary.reviewCountLabel}`
    : `GODINNER: ${summary.reviewCountLabel}`;

  if (variant === "summary") {
    return <p aria-live={summary.state === "loading" ? "polite" : undefined} aria-label={accessibleLabel} className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
      {hasRating && <span className="inline-flex items-center gap-1 text-3xl font-black text-white"><Star aria-hidden size={20} fill="currentColor"/>{formatRating(rating)}</span>}
      {hasRating && <span aria-hidden className="text-sm font-bold text-stone-400">·</span>}
      <span className={`${hasRating ? "text-xs text-stone-300" : "text-sm text-stone-300"} font-bold`}>{summary.reviewCountLabel}</span>
    </p>;
  }

  return <span aria-live={summary.state === "loading" ? "polite" : undefined} aria-label={accessibleLabel} className="inline-flex max-w-full items-center gap-1 rounded-full bg-stone-950 px-2.5 py-1 text-[11px] font-bold leading-4 text-white shadow-sm">
    <span className="text-[9px] font-black tracking-wide text-stone-300">GODINNER</span>
    {hasRating && <><Star aria-hidden size={12} fill="currentColor"/><span>{formatRating(rating)}</span><span aria-hidden className="text-stone-400">·</span></>}
    <span className="truncate">{summary.reviewCountLabel}</span>
  </span>;
}
