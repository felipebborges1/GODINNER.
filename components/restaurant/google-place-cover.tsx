"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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

export function GooglePlaceCover({ slug, fallbackUrl, alt, variant, priority = false }: {
  slug: string;
  fallbackUrl: string;
  alt: string;
  variant: "card" | "profile";
  priority?: boolean;
}) {
  const requestKey = `${slug}:${variant}`;
  const cardRef = useRef<HTMLSpanElement | null>(null);
  const [isVisible, setIsVisible] = useState(variant === "profile" || priority);
  const [state, setState] = useState<CoverState>({ key: "", metadata: null, phase: "loading" });
  const [cardState, setCardState] = useState<CardState>({ key: "", phase: "loading" });

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
      setIsVisible(true);
      observer.disconnect();
    }, { rootMargin: "160px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible, variant]);

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
      unoptimized
      sizes="(min-width: 1024px) 270px, 82vw"
      className={`object-cover transition-opacity duration-150 motion-reduce:transition-none group-hover:scale-105 ${cardLoaded ? "opacity-100" : "opacity-0"}`}
      onLoad={() => setCardState({ key: requestKey, phase: "success" })}
      onError={() => setCardState({ key: requestKey, phase: "error" })}
    />}
    {cardFailed && <Image src={fallbackUrl} alt={alt} fill sizes="(min-width: 1024px) 270px, 82vw" className="object-cover transition-opacity duration-150 motion-reduce:transition-none group-hover:scale-105"/>}
    {cardLoaded && <span translate="no" className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-normal text-white backdrop-blur-sm">Google Maps</span>}
  </span>;

  const profileState = state.key === requestKey ? state : { key: requestKey, metadata: null, phase: "loading" as const };
  const metadata = profileState.metadata;
  const loading = profileState.phase === "loading";
  const failed = profileState.phase === "error";
  const realPhoto = profileState.phase === "success" && Boolean(metadata);

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
    {failed && <Image src={fallbackUrl} alt={alt} fill priority sizes="100vw" className="object-cover transition-opacity duration-150 motion-reduce:transition-none"/>}
    {realPhoto && metadata && <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-x-1 rounded-xl bg-black/70 px-3 py-2 text-[11px] text-white backdrop-blur-sm sm:left-auto">
      {metadata.attribution && <>Foto: <a href={metadata.attribution.uri} target="_blank" rel="noreferrer" className="font-bold underline">{metadata.attribution.displayName}</a><span aria-hidden>·</span></>}
      {metadata.sourceUri ? <a href={metadata.sourceUri} target="_blank" rel="noreferrer" className="font-bold underline"><span translate="no">Google Maps</span></a> : <span translate="no">Google Maps</span>}
    </div>}
  </section>;
}
