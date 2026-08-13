"use client";

import { users } from "@/data/mocks";
import { ReviewCard } from "@/components/review/review-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppContext } from "@/hooks/use-app-context";

export default function FeedPage() {
  const { currentUserId, follows, reviews, restaurants } = useAppContext();
  const authorIds = new Set([currentUserId, ...follows.filter((follow) => follow.followerId === currentUserId).map((follow) => follow.followingId)]);
  const activities = reviews.filter((review) => authorIds.has(review.userId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <div className="mx-auto max-w-xl px-4 py-5 pb-28 lg:py-10"><p className="text-sm font-bold text-orange-600">SEGUINDO</p><h1 className="text-3xl font-black tracking-tight">Experiências recentes</h1>{activities.length ? <div className="mt-6 grid gap-4">{activities.map((review) => <ReviewCard key={review.id} review={review} user={users.find((user) => user.id === review.userId)!} restaurant={restaurants.find((restaurant) => restaurant.id === review.restaurantId)}/>)}</div> : <div className="mt-6"><EmptyState title="Seu feed está com fome." message="Siga pessoas para descobrir onde elas estão comendo."/></div>}</div>;
}
