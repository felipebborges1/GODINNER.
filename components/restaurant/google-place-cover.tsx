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
  failed: boolean;
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

export function GooglePlaceCover({ slug, fallbackUrl, alt, variant }: {
  slug: string;
  fallbackUrl: string;
  alt: string;
  variant: "card" | "profile";
}) {
  const requestKey = `${slug}:${variant}`;
  const cardRef = useRef<HTMLSpanElement | null>(null);
  const [isVisible, setIsVisible] = useState(variant === "profile");
  const [state, setState] = useState<CoverState>({ key: "", metadata: null, failed: false });

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
    if (!isVisible) return;
    let active = true;
    loadMetadata(slug, variant)
      .then((value) => {
        if (active) setState({ key: requestKey, metadata: value, failed: false });
      })
      .catch(() => {
        if (active) setState({ key: requestKey, metadata: null, failed: true });
      });
    return () => { active = false; };
  }, [isVisible, requestKey, slug, variant]);

  const metadata = state.key === requestKey ? state.metadata : null;
  const failed = state.key === requestKey && state.failed;
  const realPhoto = metadata && !failed;
  const image = <Image
    src={realPhoto ? metadata.imageUrl : fallbackUrl}
    alt={alt}
    fill
    priority={variant === "profile"}
    unoptimized={Boolean(realPhoto)}
    sizes={variant === "profile" ? "100vw" : "(min-width: 1024px) 270px, 72vw"}
    className={variant === "card" ? "object-cover transition duration-500 group-hover:scale-105" : "object-cover"}
    onError={() => setState({ key: requestKey, metadata: null, failed: true })}
  />;

  if (variant === "card") return <span ref={cardRef} className="absolute inset-0 block">
    {image}
    {realPhoto && <span translate="no" className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-normal text-white backdrop-blur-sm">Google Maps</span>}
  </span>;

  return <section className="relative aspect-[4/3] overflow-hidden bg-stone-100 lg:h-[430px] lg:aspect-auto lg:rounded-[2rem]">
    {image}
    {realPhoto && <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-x-1 rounded-xl bg-black/70 px-3 py-2 text-[11px] text-white backdrop-blur-sm sm:left-auto">
      {metadata.attribution && <>Foto: <a href={metadata.attribution.uri} target="_blank" rel="noreferrer" className="font-bold underline">{metadata.attribution.displayName}</a><span aria-hidden>·</span></>}
      {metadata.sourceUri ? <a href={metadata.sourceUri} target="_blank" rel="noreferrer" className="font-bold underline"><span translate="no">Google Maps</span></a> : <span translate="no">Google Maps</span>}
    </div>}
  </section>;
}
