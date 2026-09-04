"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Restaurant } from "@/types";

const MapView = dynamic(() => import("@/components/search/map-view").then((module) => module.MapView), {
  ssr: false,
  loading: () => <MapPlaceholder loading/>,
});

function MapPlaceholder({ loading = false }: { loading?: boolean }) {
  return <div className="grid min-h-[480px] place-items-center rounded-3xl bg-[#e8f0e4] px-5 text-center shadow-inner ring-1 ring-stone-200 sm:min-h-[560px] lg:min-h-[620px]">
    <div className="max-w-xs rounded-2xl bg-white/90 p-5 shadow-sm">
      <MapPin className={`mx-auto text-orange-500 ${loading ? "animate-pulse motion-reduce:animate-none" : ""}`} size={24}/>
      <p className="mt-2 text-sm font-bold text-stone-700">{loading ? "Carregando mapa…" : "O mapa será carregado ao chegar nesta seção."}</p>
    </div>
  </div>;
}

export function DeferredMapView({ restaurants }: { restaurants: Restaurant[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldLoad) return;
    if (typeof IntersectionObserver === "undefined") {
      const timeout = globalThis.setTimeout(() => setShouldLoad(true), 0);
      return () => globalThis.clearTimeout(timeout);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: "320px 0px" });
    observer.observe(container);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return <div ref={containerRef}>{shouldLoad ? <MapView restaurants={restaurants}/> : <MapPlaceholder/>}</div>;
}
