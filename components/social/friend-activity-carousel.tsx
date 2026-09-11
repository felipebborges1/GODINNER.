"use client";

import { useCallback, useRef, useState } from "react";
import type { Restaurant, Review, User } from "@/types";
import { FriendActivityCard } from "@/components/social/friend-activity-card";

export type FriendActivity = {
  review: Review;
  user: User;
  restaurant: Restaurant;
};

export function FriendActivityCarousel({ activities }: { activities: FriendActivity[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [photoRequests, setPhotoRequests] = useState<Record<string, { index: number; transitionId: number }>>({});

  const navigateReview = useCallback((fromIndex: number, direction: -1 | 1) => {
    const targetIndex = fromIndex + direction;
    const target = activities[targetIndex];
    if (!target) return;

    const targetPhotoIndex = direction === 1 ? 0 : Math.max(target.review.photos.length - 1, 0);
    setActiveIndex(targetIndex);
    setPhotoRequests((current) => ({
      ...current,
      [target.review.id]: {
        index: targetPhotoIndex,
        transitionId: (current[target.review.id]?.transitionId ?? 0) + 1,
      },
    }));

    window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const card = cardRefs.current[targetIndex];
      if (!container || !card) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      container.scrollTo({ left: card.offsetLeft - container.offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }, [activities]);

  if (!activities.length) return null;

  return <div ref={containerRef} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" aria-label="Experiências dos seus amigos">
    {activities.map((activity, index) => <div key={activity.review.id} ref={(element) => { cardRefs.current[index] = element; }} className="shrink-0">
      <FriendActivityCard
        {...activity}
        reviewPosition={index}
        reviewCount={activities.length}
        mediaPriority={index === 0}
        mediaEager={index === activeIndex || index === activeIndex + 1}
        photoIndexRequest={photoRequests[activity.review.id]}
        onNavigateReview={(direction) => navigateReview(index, direction)}
        onActivate={() => setActiveIndex(index)}
      />
    </div>)}
  </div>;
}
