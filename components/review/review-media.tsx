"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { moveReviewPhotoIndex, orderReviewPhotos } from "@/lib/review-media";
import { cn } from "@/lib/utils";
import type { RestaurantPhoto } from "@/types";

type ReviewMediaProps = {
  photos: RestaurantPhoto[];
  alt: string;
  fallback?: ReactNode;
  priority?: boolean;
  rounded?: boolean;
  className?: string;
};

export function ReviewMedia({ photos, alt, fallback = null, priority = false, rounded = true, className }: ReviewMediaProps) {
  const orderedPhotos = useMemo(() => orderReviewPhotos(photos), [photos]);
  const photoCount = orderedPhotos.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const activePhoto = orderedPhotos[activeIndex];

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(photoCount - 1, 0)));
  }, [photoCount]);

  useEffect(() => {
    if (!lightboxOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") setActiveIndex((current) => moveReviewPhotoIndex(current, photoCount, -1));
      if (event.key === "ArrowRight") setActiveIndex((current) => moveReviewPhotoIndex(current, photoCount, 1));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, photoCount]);

  if (!activePhoto) return fallback;

  const move = (direction: -1 | 1) => setActiveIndex((current) => moveReviewPhotoIndex(current, photoCount, direction));
  const handleTouchEnd = (clientX: number) => {
    if (touchStartX === null) return;
    const delta = clientX - touchStartX;
    if (Math.abs(delta) >= 40) move(delta < 0 ? 1 : -1);
    setTouchStartX(null);
  };

  const image = (sizes: string, eager = false) => <Image
    src={activePhoto.url}
    alt={`${alt} · foto ${activeIndex + 1} de ${photoCount}`}
    fill
    priority={eager}
    sizes={sizes}
    className="object-contain p-1"
  />;

  return <>
    <div
      className={cn("relative isolate aspect-[4/3] overflow-hidden bg-stone-100", rounded && "rounded-2xl", className)}
      onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
    >
      <button type="button" onClick={() => setLightboxOpen(true)} className="absolute inset-0 block w-full cursor-zoom-in" aria-label={`Ampliar foto ${activeIndex + 1} de ${photoCount}`}>
        {image("(min-width: 1024px) 576px, (min-width: 640px) 480px, 100vw", priority && activeIndex === 0)}
      </button>
      {photoCount > 1 && <>
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-stone-950/80 px-2.5 py-1 text-xs font-bold text-white">{activeIndex + 1} / {photoCount}</span>
        <button type="button" onClick={() => move(-1)} aria-label="Foto anterior" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-stone-950 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><ChevronLeft size={20}/></button>
        <button type="button" onClick={() => move(1)} aria-label="Próxima foto" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-stone-950 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><ChevronRight size={20}/></button>
      </>}
    </div>
    {lightboxOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/80 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={`Fotos da experiência: ${alt}`} onMouseDown={() => setLightboxOpen(false)}>
      <section className="w-full max-w-4xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between text-sm font-bold text-white"><span>{activeIndex + 1} de {photoCount}</span><button ref={closeButtonRef} type="button" onClick={() => setLightboxOpen(false)} aria-label="Fechar galeria" className="grid h-11 w-11 place-items-center rounded-full bg-white/15 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X size={22}/></button></div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-900" onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)} onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}>
          {image("(min-width: 1024px) 960px, 100vw")}
          {photoCount > 1 && <><button type="button" onClick={() => move(-1)} aria-label="Foto anterior" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-stone-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><ChevronLeft size={22}/></button><button type="button" onClick={() => move(1)} aria-label="Próxima foto" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-stone-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><ChevronRight size={22}/></button></>}
        </div>
      </section>
    </div>}
  </>;
}
