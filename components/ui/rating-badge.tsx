import { Star } from "lucide-react";
import { formatRating } from "@/lib/review-rating";
export function RatingBadge({ rating, label }: { rating: number; label?: string }) { return <span className="inline-flex items-center gap-1 rounded-full bg-stone-950 px-2.5 py-1 text-xs font-bold text-white"><Star size={12} fill="currentColor" />{formatRating(rating)}{label && <span className="font-medium text-stone-300">{label}</span>}</span>; }
