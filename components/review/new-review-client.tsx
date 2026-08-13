"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { restaurants } from "@/data/mocks";
import { RestaurantSelector } from "@/components/review/restaurant-selector";
import { ReviewForm } from "@/components/review/review-form";
import type { Restaurant } from "@/types";

export function NewReviewClient() {
  const searchParams = useSearchParams();
  const preset = restaurants.find((restaurant) => restaurant.slug === searchParams.get("restaurant"));
  const [selected, setSelected] = useState<Restaurant | null>(preset ?? null);
  return selected ? <ReviewForm restaurant={selected}/> : <RestaurantSelector onSelect={setSelected}/>;
}
