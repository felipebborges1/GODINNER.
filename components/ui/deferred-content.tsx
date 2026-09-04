"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export function DeferredContent({ children, label = "Carregando conteúdo" }: { children: ReactNode; label?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || isReady) return;
    if (typeof IntersectionObserver === "undefined") {
      const timeout = globalThis.setTimeout(() => setIsReady(true), 0);
      return () => globalThis.clearTimeout(timeout);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setIsReady(true);
      observer.disconnect();
    }, { rootMargin: "480px 0px" });
    observer.observe(container);
    return () => observer.disconnect();
  }, [isReady]);

  return <div ref={containerRef}>{isReady ? children : <div className="mt-10" aria-label={label}><LoadingSkeleton className="h-7 w-48"/><div className="mt-4 flex gap-4 overflow-hidden"><LoadingSkeleton className="h-72 w-[82vw] max-w-80 shrink-0 sm:w-72"/><LoadingSkeleton className="h-72 w-[82vw] max-w-80 shrink-0 sm:w-72"/></div></div>}</div>;
}
