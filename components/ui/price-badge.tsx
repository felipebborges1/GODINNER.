import type { PriceRange } from "@/types";
export function PriceBadge({ price }: { price: PriceRange }) { return <span className="text-sm font-semibold text-stone-600">{price}</span>; }
