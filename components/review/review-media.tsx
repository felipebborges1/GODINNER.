"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { preload } from "react-dom";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { getReviewPhotoSwipeDirection, moveReviewPhotoIndex, orderReviewPhotos } from "@/lib/review-media";
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadedPhotoIds, setLoadedPhotoIds] = useState<Set<string>>(() => new Set());
  const activeIndex = Math.min(selectedIndex, Math.max(photoCount - 1, 0));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const pointerStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const ignoreClickUntilRef = useRef(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const activePhoto = orderedPhotos[activeIndex];

  useEffect(() => {
    const nextPhoto = orderedPhotos[activeIndex + 1];
    if (!nextPhoto || typeof window === "undefined") return;

    const preloadedImage = new window.Image();
    preloadedImage.decoding = "async";
    preloadedImage.src = nextPhoto.url;
    void preloadedImage.decode().catch(() => undefined);
  }, [activeIndex, orderedPhotos]);

  useEffect(() => {
    if (!lightboxOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") setSelectedIndex((current) => moveReviewPhotoIndex(Math.min(current, Math.max(photoCount - 1, 0)), photoCount, -1));
      if (event.key === "ArrowRight") setSelectedIndex((current) => moveReviewPhotoIndex(Math.min(current, Math.max(photoCount - 1, 0)), photoCount, 1));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, photoCount]);

  if (!activePhoto) return fallback;

  const move = (direction: -1 | 1) => setSelectedIndex((current) => moveReviewPhotoIndex(Math.min(current, Math.max(photoCount - 1, 0)), photoCount, direction));
  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    if (!start || start.id !== event.pointerId) return;
    pointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

    const direction = getReviewPhotoSwipeDirection(start.x, start.y, event.clientX, event.clientY);
    if (direction === null) return;
    ignoreClickUntilRef.current = Date.now() + 350;
    move(direction);
  };

  const markPhotoLoaded = async (photoId: string, image: HTMLImageElement) => {
    try {
      await image.decode();
    } catch {
      // Some cached browser images report an already-decoded failure here.
      // The load event is still sufficient to reveal the image safely.
    }
    setLoadedPhotoIds((current) => {
      if (current.has(photoId)) return current;
      const next = new Set(current);
      next.add(photoId);
      return next;
    });
  };

  const galleryTrack = (sizes: string, eager = false) => <div
    className="flex h-full w-full transition-transform duration-200 ease-out motion-reduce:transition-none"
    style={{ transform: `translateX(-${activeIndex * 100}%)` }}
  >
    {orderedPhotos.map((photo, index) => {
      const shouldRenderImage = Math.abs(index - activeIndex) <= 1;
      const isLoaded = loadedPhotoIds.has(photo.id);
      const isFirstPriorityMedia = eager && index === 0;
      if (isFirstPriorityMedia) preload(photo.url, { as: "image", fetchPriority: "high" });
      return <div className="relative h-full w-full shrink-0 bg-stone-200" key={photo.id}>
        {shouldRenderImage && <Image
          src={photo.url}
          alt={`${alt} · foto ${index + 1} de ${photoCount}`}
          fill
          priority={isFirstPriorityMedia}
          fetchPriority={isFirstPriorityMedia ? "high" : "auto"}
          loading={isFirstPriorityMedia ? undefined : index === activeIndex + 1 ? "eager" : "lazy"}
          sizes={sizes}
          // The route performs the authorization check and redirects to a
          // short-lived Storage URL. Let the browser follow that redirect
          // directly; Next's optimizer rejects redirect-only image responses.
          unoptimized={photo.url.startsWith("/api/review-photo/")}
          draggable={false}
          className={cn("object-contain p-1 transition-opacity duration-200 motion-reduce:transition-none", isLoaded ? "opacity-100" : "opacity-0")}
          onLoad={(event) => void markPhotoLoaded(photo.id, event.currentTarget)}
        />}
      </div>;
    })}
  </div>;

  const startPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const cancelPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerStartRef.current?.id === event.pointerId) pointerStartRef.current = null;
  };

  const openLightbox = () => {
    if (Date.now() < ignoreClickUntilRef.current) return;
    setLightboxOpen(true);
  };

  const handleGalleryKeyDown = (key: string) => {
    if (key === "ArrowLeft") move(-1);
    if (key === "ArrowRight") move(1);
  };

  return <>
    <div
      className={cn("relative isolate aspect-[4/3] overflow-hidden bg-stone-100", rounded && "rounded-2xl", className)}
      onPointerDown={startPointer}
      onPointerUp={handlePointerEnd}
      onPointerCancel={cancelPointer}
      onKeyDown={(event) => handleGalleryKeyDown(event.key)}
      tabIndex={photoCount > 1 ? 0 : undefined}
      style={{ touchAction: "pan-y" }}
    >
      {!loadedPhotoIds.has(activePhoto.id) && <div className="pointer-events-none absolute inset-0 z-10 animate-pulse bg-stone-200" aria-hidden="true"/>}
      <button type="button" onClick={openLightbox} onDragStart={(event) => event.preventDefault()} className="absolute inset-0 block w-full cursor-zoom-in" aria-label={`Ampliar foto ${activeIndex + 1} de ${photoCount}`}>
        {galleryTrack("(min-width: 1024px) 576px, (min-width: 640px) 480px, 100vw", priority)}
      </button>
      {photoCount > 1 && <>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-stone-950/80 px-2.5 py-1 text-xs font-bold text-white">{activeIndex + 1} / {photoCount}</span>
        <span className="sr-only" aria-live="polite">Foto {activeIndex + 1} de {photoCount}</span>
        <button type="button" onClick={() => move(-1)} aria-label="Foto anterior" className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-stone-950 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 md:grid"><ChevronLeft size={20}/></button>
        <button type="button" onClick={() => move(1)} aria-label="Próxima foto" className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-stone-950 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 md:grid"><ChevronRight size={20}/></button>
      </>}
    </div>
    {lightboxOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/80 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={`Fotos da experiência: ${alt}`} onMouseDown={() => setLightboxOpen(false)}>
      <section className="w-full max-w-4xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between text-sm font-bold text-white"><span>{activeIndex + 1} de {photoCount}</span><button ref={closeButtonRef} type="button" onClick={() => setLightboxOpen(false)} aria-label="Fechar galeria" className="grid h-11 w-11 place-items-center rounded-full bg-white/15 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X size={22}/></button></div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-900" onPointerDown={startPointer} onPointerUp={handlePointerEnd} onPointerCancel={cancelPointer} style={{ touchAction: "pan-y" }}>
          {!loadedPhotoIds.has(activePhoto.id) && <div className="pointer-events-none absolute inset-0 z-10 animate-pulse bg-stone-800" aria-hidden="true"/>}
          {galleryTrack("(min-width: 1024px) 960px, 100vw")}
          {photoCount > 1 && <><button type="button" onClick={() => move(-1)} aria-label="Foto anterior" className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-stone-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 md:grid"><ChevronLeft size={22}/></button><button type="button" onClick={() => move(1)} aria-label="Próxima foto" className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-stone-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 md:grid"><ChevronRight size={22}/></button></>}
        </div>
      </section>
    </div>}
  </>;
}
