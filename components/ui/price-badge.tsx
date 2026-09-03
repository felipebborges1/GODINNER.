import type { PriceRange } from "@/types";
export function PriceBadge({ price }: { price: PriceRange | null | undefined }) { return price ? <span className="text-sm font-semibold text-stone-600">{price}</span> : null; }
