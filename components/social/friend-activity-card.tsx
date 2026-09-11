"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { Restaurant, Review, User } from "@/types";
import { GooglePlaceCover, RestaurantPhotoUnavailable } from "@/components/restaurant/google-place-cover";
import { ReviewMedia } from "@/components/review/review-media";
import { RatingBadge } from "@/components/ui/rating-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getReviewScore } from "@/lib/review-rating";
import { getReviewPhotoSwipeDirection } from "@/lib/review-media";

type FriendActivityCardProps = {
  user: User;
  restaurant: Restaurant;
  review: Review;
  mediaPriority?: boolean;
  mediaEager?: boolean;
  photoIndexRequest?: { index: number; transitionId: number };
  onNavigateReview: (direction: -1 | 1) => void;
  onActivate: () => void;
};

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, [data-activity-media]"));
}

export function FriendActivityCard({
  user,
  restaurant,
  review,
  mediaPriority = false,
  mediaEager = false,
  photoIndexRequest,
  onNavigateReview,
  onActivate,
}: FriendActivityCardProps) {
  const score = getReviewScore(review);
  const pointerStartRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const startCardPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;
    onActivate();
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishCardPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const start = pointerStartRef.current;
    if (!start || start.id !== event.pointerId) return;
    pointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const direction = getReviewPhotoSwipeDirection(start.x, start.y, event.clientX, event.clientY);
    if (direction !== null) onNavigateReview(direction);
  };

  const cancelCardPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (pointerStartRef.current?.id === event.pointerId) pointerStartRef.current = null;
  };

  return <article
    className="w-[82vw] max-w-80 shrink-0 snap-start overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-100 sm:w-72"
    onPointerDown={startCardPointer}
    onPointerUp={finishCardPointer}
    onPointerCancel={cancelCardPointer}
    style={{ touchAction: "pan-y" }}
  >
    <div className="flex items-center gap-2.5 px-3.5 pt-3.5"><Link href={`/user/${user.username}`}><UserAvatar src={user.avatar} name={user.name} size="sm"/></Link><div className="min-w-0 flex-1"><Link href={`/user/${user.username}`} className="block truncate text-sm font-bold">{user.name}</Link><p className="truncate text-xs text-stone-500">esteve no <Link href={`/restaurant/${restaurant.slug}`} className="font-semibold text-stone-700">{restaurant.name}</Link></p></div></div>
    <div className="relative mt-3"><ReviewMedia
      photos={review.photos}
      alt={`Foto da experiência no ${restaurant.name}`}
      rounded={false}
      priority={mediaPriority}
      eager={mediaEager}
      key={`${review.id}:${photoIndexRequest?.transitionId ?? "initial"}`}
      initialPhotoIndex={photoIndexRequest?.index ?? 0}
      onBoundarySwipe={onNavigateReview}
      fallback={restaurant.hasGooglePlaceCover ? <Link href={`/restaurant/${restaurant.slug}`} className="relative block aspect-[4/3] overflow-hidden"><GooglePlaceCover slug={restaurant.slug} alt={restaurant.name} variant="card" priority={mediaPriority} eager={mediaEager}/></Link> : <Link href={`/restaurant/${restaurant.slug}`} className="relative block aspect-[4/3] overflow-hidden">{restaurant.coverPhoto.url ? <Image src={restaurant.coverPhoto.url} alt={restaurant.name} fill priority={mediaPriority} loading={mediaPriority ? undefined : mediaEager ? "eager" : "lazy"} sizes="288px" className="object-cover"/> : <RestaurantPhotoUnavailable alt={restaurant.name} variant="card"/>}</Link>}
    /><div className="pointer-events-none absolute bottom-3 left-3">{score !== null && <RatingBadge rating={score}/>}</div></div>
    <p className="px-3.5 py-3 text-xs text-stone-500">{new Date(review.visitDate).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</p>
  </article>;
}
