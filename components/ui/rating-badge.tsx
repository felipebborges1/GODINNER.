import { Star } from "lucide-react";
export function RatingBadge({ rating, label }: { rating: number; label?: string }) { return <span className="inline-flex items-center gap-1 rounded-full bg-stone-950 px-2.5 py-1 text-xs font-bold text-white"><Star size={12} fill="currentColor" />{rating.toFixed(1)}{label && <span className="font-medium text-stone-300">{label}</span>}</span>; }
