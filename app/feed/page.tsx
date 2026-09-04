"use client";

import { useMemo, useState } from "react";
import { ReviewCard } from "@/components/review/review-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/hooks/use-app-context";
import { dedupeReviewsById, orderReviewsForFeed } from "@/lib/feed-pagination";
import { Search } from "lucide-react";

const FEED_PAGE_SIZE = 10;

export default function FeedPage() {
  const { currentUserId, follows, reviews, restaurants, users, isLoading, dataError, retryData } = useAppContext();
  const [visibleCount, setVisibleCount] = useState(FEED_PAGE_SIZE);
  const activities = useMemo(() => {
    if (!currentUserId) return [];
    const authorIds = new Set([currentUserId, ...follows.filter((follow) => follow.followerId === currentUserId).map((follow) => follow.followingId)]);
    return orderReviewsForFeed(dedupeReviewsById(reviews.filter((review) => authorIds.has(review.userId))));
  }, [currentUserId, follows, reviews]);
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const restaurantsById = useMemo(() => new Map(restaurants.map((restaurant) => [restaurant.id, restaurant])), [restaurants]);

  if (isLoading) return <div className="mx-auto max-w-xl px-4 py-8"><LoadingSkeleton className="h-8 w-56"/><LoadingSkeleton className="mt-6 h-48"/><LoadingSkeleton className="mt-4 h-48"/></div>;
  if (dataError) return <div className="mx-auto max-w-xl px-4 py-8"><ErrorState message={dataError} onRetry={retryData}/></div>;
  const visibleActivities = activities.slice(0, visibleCount);
  const hasMore = visibleActivities.length < activities.length;

  return <div className="mx-auto max-w-xl px-4 py-5 pb-28 lg:py-10"><div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-orange-600">SEGUINDO</p><h1 className="text-3xl font-black tracking-tight">Experiências recentes</h1></div><Button href="/people" variant="soft" className="shrink-0 border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 active:bg-orange-200 dark:border-orange-400/40 dark:bg-orange-400/10 dark:text-orange-300 dark:hover:bg-orange-400/20"><Search size={16} aria-hidden="true"/>Encontrar pessoas</Button></div>{activities.length ? <><div className="mt-6 grid gap-4">{visibleActivities.map((review) => { const user = usersById.get(review.userId); return user ? <ReviewCard key={review.id} review={review} user={user} restaurant={restaurantsById.get(review.restaurantId)}/> : null; })}</div>{hasMore && <div className="mt-6 text-center"><Button type="button" variant="soft" onClick={() => setVisibleCount((count) => count + FEED_PAGE_SIZE)}>Carregar mais</Button></div>}</> : <div className="mt-6"><EmptyState title="Seu feed está com fome." message="Siga pessoas para descobrir onde elas estão comendo." actionLabel="Encontrar pessoas" actionHref="/people"/></div>}</div>;
}
