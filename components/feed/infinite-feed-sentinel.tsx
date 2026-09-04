"use client";

import { useEffect, useRef, useState } from "react";

export function InfiniteFeedSentinel({ hasMore, onLoadMore }: { hasMore: boolean; onLoadMore: () => void }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!hasMore || !sentinel) return;

    let frameId: number | undefined;
    const loadMore = () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setIsLoadingMore(true);
      frameId = window.requestAnimationFrame(() => {
        onLoadMore();
        loadingRef.current = false;
        setIsLoadingMore(false);
      });
    };

    if (!("IntersectionObserver" in window)) {
      loadMore();
      return () => {
        if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      };
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) loadMore();
    }, { rootMargin: "1200px 0px" });
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    };
  }, [hasMore, onLoadMore]);

  return <div ref={sentinelRef} className="py-6 text-center text-sm text-stone-500" aria-live="polite">
    {hasMore ? isLoadingMore ? "Carregando mais experiências…" : "Mais experiências serão carregadas automaticamente." : "Você chegou ao fim das experiências por enquanto."}
  </div>;
}
