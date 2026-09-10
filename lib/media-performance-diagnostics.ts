"use client";

type MediaStage = "mounted" | "lookahead" | "request-ready" | "loaded" | "decoded" | "visible" | "error" | "unmounted";

type MediaDiagnostic = {
  source: "google-card" | "review-photo" | "avatar";
  key: string;
  stage: MediaStage;
  elapsedMs: number;
};

declare global {
  interface Window {
    __godinnerMediaDiagnostics?: MediaDiagnostic[];
  }
}

function diagnosticsEnabled() {
  if (typeof window === "undefined") return false;
  const isPreview = window.location.hostname.endsWith(".vercel.app") && window.location.hostname !== "godinner-beta.vercel.app";
  return (process.env.NODE_ENV === "development" || isPreview) && new URLSearchParams(window.location.search).has("mediaDebug");
}

/** Preview/dev-only timings. It intentionally never records URLs, tokens, or people. */
export function recordMediaDiagnostic(source: MediaDiagnostic["source"], key: string, stage: MediaStage, startedAt: number) {
  if (!diagnosticsEnabled()) return;
  const event = { source, key, stage, elapsedMs: Math.round(performance.now() - startedAt) };
  const events = window.__godinnerMediaDiagnostics ?? [];
  window.__godinnerMediaDiagnostics = [...events.slice(-79), event];
  console.debug("[godinner-media]", event);
}
