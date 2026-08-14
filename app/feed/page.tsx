"use client";

import { ReviewCard } from "@/components/review/review-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAppContext } from "@/hooks/use-app-context";

export default function FeedPage() {
  const { currentUserId, follows, reviews, restaurants, users, isLoading, dataError, retryData } = useAppContext();
  if (isLoading) return <div className="mx-auto max-w-xl px-4 py-8"><LoadingSkeleton className="h-8 w-56"/><LoadingSkeleton className="mt-6 h-48"/><LoadingSkeleton className="mt-4 h-48"/></div>;
  if (dataError) return <div className="mx-auto max-w-xl px-4 py-8"><ErrorState message={dataError} onRetry={retryData}/></div>;
  const authorIds = new Set([currentUserId, ...follows.filter((follow) => follow.followerId === currentUserId).map((follow) => follow.followingId)]);
  const activities = reviews.filter((review) => authorIds.has(review.userId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <div className="mx-auto max-w-xl px-4 py-5 pb-28 lg:py-10"><p className="text-sm font-bold text-orange-600">SEGUINDO</p><h1 className="text-3xl font-black tracking-tight">Experiências recentes</h1>{activities.length ? <div className="mt-6 grid gap-4">{activities.map((review) => { const user = users.find((item) => item.id === review.userId); return user ? <ReviewCard key={review.id} review={review} user={user} restaurant={restaurants.find((restaurant) => restaurant.id === review.restaurantId)}/> : null; })}</div> : <div className="mt-6"><EmptyState title="Seu feed está com fome." message="Siga pessoas para descobrir onde elas estão comendo." actionLabel="Encontrar pessoas" actionHref="/search"/></div>}</div>;
}
