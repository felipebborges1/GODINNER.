"use client";

import { restaurants, users } from "@/data/mocks";
import { ReviewCard } from "@/components/review/review-card";
import { useReviews } from "@/hooks/use-reviews";

export default function FeedPage() {
  const reviews = useReviews();
  return <div className="mx-auto max-w-xl px-4 py-5 lg:py-10"><p className="text-sm font-bold text-orange-600">SEGUINDO</p><h1 className="text-3xl font-black tracking-tight">Experiências recentes</h1><div className="mt-6 grid gap-4">{reviews.slice(0, 8).map((review) => <ReviewCard key={review.id} review={review} user={users.find((user) => user.id === review.userId)!} restaurant={restaurants.find((restaurant) => restaurant.id === review.restaurantId)}/>)}</div></div>;
}
