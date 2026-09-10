"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { recordMediaDiagnostic } from "@/lib/media-performance-diagnostics";

type PhotoMetadata = {
  imageUrl: string;
  attribution: { displayName: string; uri: string } | null;
  sourceUri: string | null;
};

type CoverState = {
  key: string;
  metadata: PhotoMetadata | null;
  phase: "loading" | "success" | "error";
};

type CardState = {
  key: string;
  phase: "loading" | "success" | "error";
};

const inFlightMetadata = new Map<string, Promise<PhotoMetadata>>();

function loadMetadata(slug: string, variant: "card" | "profile") {
  const key = `${slug}:${variant}`;
  const pending = inFlightMetadata.get(key);
  if (pending) return pending;

  const request = fetch(`/api/google-places/${slug}?variant=${variant}`, { cache: "no-store" })
    .then((response) => response.ok ? response.json() as Promise<PhotoMetadata> : Promise.reject(new Error("Foto indisponível")));
  inFlightMetadata.set(key, request);
  request.then(
    () => inFlightMetadata.delete(key),
    () => inFlightMetadata.delete(key),
  );
  return request;
}

export function GooglePlaceCover({ slug, alt, variant, priority = false, eager = false }: {
  slug: string;
  alt: string;
  variant: "card" | "profile";
  priority?: boolean;
  /** Starts one adjacent carousel card without making it a high-priority image. */
  eager?: boolean;
}) {
  const requestKey = `${slug}:${variant}`;
  const cardRef = useRef<HTMLSpanElement | null>(null);
  const startedAt = useRef(typeof performance === "undefined" ? 0 : performance.now());
  const [isVisible, setIsVisible] = useState(variant === "profile" || priority || eager);
  const [state, setState] = useState<CoverState>({ key: "", metadata: null, phase: "loading" });
  const [cardState, setCardState] = useState<CardState>({ key: "", phase: "loading" });

  useEffect(() => {
    recordMediaDiagnostic("google-card", requestKey, "mounted", startedAt.current);
    return () => recordMediaDiagnostic("google-card", requestKey, "unmounted", startedAt.current);
  }, [requestKey]);

  useEffect(() => {
    if (variant === "profile" || isVisible) return;
    const element = cardRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      const timeout = globalThis.setTimeout(() => setIsVisible(true), 0);
      return () => globalThis.clearTimeout(timeout);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      recordMediaDiagnostic("google-card", requestKey, "lookahead", startedAt.current);
      setIsVisible(true);
      observer.disconnect();
    // Horizontal carousels use cards wider than the former 160px lookahead.
    // One-card horizontal margin starts the image before its snap point is visible.
    }, { rootMargin: "160px 360px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible, requestKey, variant]);

  useEffect(() => {
    if (variant !== "profile") return;
    let active = true;
    loadMetadata(slug, variant)
      .then((value) => {
        if (active) setState({ key: requestKey, metadata: value, phase: "loading" });
      })
      .catch(() => {
        if (active) setState({ key: requestKey, metadata: null, phase: "error" });
      });
    return () => { active = false; };
  }, [requestKey, slug, variant]);

  const cardPhase = cardState.key === requestKey ? cardState.phase : "loading";
  const cardLoaded = cardPhase === "success";
  const cardFailed = cardPhase === "error";

  if (variant === "card") return <span ref={cardRef} aria-busy={!cardLoaded && !cardFailed} className="absolute inset-0 block overflow-hidden bg-stone-100">
    {!cardLoaded && !cardFailed && <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-stone-100 via-stone-200 to-stone-100 motion-reduce:animate-none" aria-hidden="true"/>}
    {isVisible && !cardFailed && <Image
      src={`/api/google-places/${slug}?media=1&variant=card`}
      alt={alt}
      fill
      priority={priority}
      loading={priority ? undefined : eager ? "eager" : "lazy"}
      unoptimized
      sizes="(min-width: 1024px) 270px, 82vw"
      className={`object-cover transition-opacity duration-150 motion-reduce:transition-none group-hover:scale-105 ${cardLoaded ? "opacity-100" : "opacity-0"}`}
      onLoad={(event) => {
        recordMediaDiagnostic("google-card", requestKey, "loaded", startedAt.current);
        void event.currentTarget.decode().catch(() => undefined).finally(() => {
          recordMediaDiagnostic("google-card", requestKey, "decoded", startedAt.current);
          setCardState({ key: requestKey, phase: "success" });
          recordMediaDiagnostic("google-card", requestKey, "visible", startedAt.current);
        });
      }}
      onError={() => {
        recordMediaDiagnostic("google-card", requestKey, "error", startedAt.current);
        setCardState({ key: requestKey, phase: "error" });
      }}
    />}
    {cardFailed && <RestaurantPhotoUnavailable alt={alt} variant="card"/>}
    {cardLoaded && <span translate="no" className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-normal text-white backdrop-blur-sm">Google Maps</span>}
  </span>;

  const profileState = state.key === requestKey ? state : { key: requestKey, metadata: null, phase: "loading" as const };
  const metadata = profileState.metadata;
  const loading = profileState.phase === "loading";
  const failed = profileState.phase === "error";
  const realPhoto = profileState.phase === "success" && Boolean(metadata);

  if (failed) return <RestaurantPhotoUnavailable alt={alt} variant="profile"/>;

  return <section aria-busy={loading} className="relative aspect-[4/3] overflow-hidden bg-stone-100 lg:h-[430px] lg:aspect-auto lg:rounded-[2rem]">
    {loading && <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-stone-100 via-stone-200 to-stone-100 motion-reduce:animate-none" aria-hidden="true"/>}
    {metadata && !failed && <Image
      src={metadata.imageUrl}
      alt={alt}
      fill
      priority
      unoptimized
      sizes="100vw"
      className={`object-cover transition-opacity duration-150 motion-reduce:transition-none ${profileState.phase === "success" ? "opacity-100" : "opacity-0"}`}
      onLoad={() => setState({ key: requestKey, metadata, phase: "success" })}
      onError={() => setState({ key: requestKey, metadata: null, phase: "error" })}
    />}
    {realPhoto && metadata && <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-x-1 rounded-xl bg-black/70 px-3 py-2 text-[11px] text-white backdrop-blur-sm sm:left-auto">
      {metadata.attribution && <>Foto: <a href={metadata.attribution.uri} target="_blank" rel="noreferrer" className="font-bold underline">{metadata.attribution.displayName}</a><span aria-hidden>·</span></>}
      {metadata.sourceUri ? <a href={metadata.sourceUri} target="_blank" rel="noreferrer" className="font-bold underline"><span translate="no">Google Maps</span></a> : <span translate="no">Google Maps</span>}
    </div>}
  </section>;
}

export function RestaurantPhotoUnavailable({ alt, variant }: { alt: string; variant: "card" | "profile" }) {
  const message = <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-stone-600 shadow-sm ring-1 ring-stone-200">Foto indisponível</span>;
  if (variant === "card") return <span role="img" aria-label={`Foto indisponível: ${alt}`} className="absolute inset-0 grid place-items-center bg-stone-100">{message}</span>;
  return <section role="img" aria-label={`Foto indisponível: ${alt}`} className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-stone-100 lg:h-[430px] lg:aspect-auto lg:rounded-[2rem]">{message}</section>;
}
