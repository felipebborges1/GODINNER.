"use client";

import { useEffect, useRef, useState } from "react";
import { canCheckCatalogCoverage, catalogCoverageKey, getCatalogCoverageSessionId } from "@/lib/catalog-coverage";
import { trackEvent } from "@/lib/analytics";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ExploreLocationMode, ExploreRegion } from "@/context/explore-location-context";

type CoverageStatus = "idle" | "checking" | "covered" | "zero" | "unavailable";
type CoverageResult = { zero_coverage: boolean; coverage_recorded: boolean };

export function useCatalogCoverage({ mode, region, fallbackPublishedCount, catalogReady }: { mode: ExploreLocationMode; region: ExploreRegion | null; fallbackPublishedCount: number | null; catalogReady: boolean }) {
  const [result, setResult] = useState<{ key: string; status: CoverageStatus }>({ key: "", status: "idle" });
  const attempted = useRef(new Set<string>());
  const key = canCheckCatalogCoverage(mode, region) && region ? catalogCoverageKey(region) : "";
  const status: CoverageStatus = key && result.key === key ? result.status : key ? "checking" : "idle";

  useEffect(() => {
    if (!key || !region) return;
    if (attempted.current.has(key)) return;
    attempted.current.add(key);
    const client = createSupabaseBrowserClient();
    if (!client) {
      queueMicrotask(() => setResult({ key, status: "unavailable" }));
      return;
    }
    let active = true;
    let sessionId: string | null = null;
    try { sessionId = getCatalogCoverageSessionId(window.sessionStorage); } catch { /* Authenticated requests do not need the anonymous-session fallback. */ }
    void client.rpc("record_catalog_coverage_signal", { p_city: region.city, p_state: region.region ?? null, p_country_code: region.countryCode!.toUpperCase(), p_session_id: sessionId }).then(({ data, error }) => {
      if (!active) return;
      const result = (Array.isArray(data) ? data[0] : data) as CoverageResult | null;
      if (!error && result) {
        setResult({ key, status: result.zero_coverage ? "zero" : "covered" });
        if (result.zero_coverage) trackEvent("catalog_zero_coverage_detected", { countryCode: region.countryCode, hasState: Boolean(region.region) });
        return;
      }
      // Home already has this catalog in memory. This is only a visual fallback;
      // the RPC remains authoritative whenever it responds.
      setResult({ key, status: catalogReady && fallbackPublishedCount === 0 ? "zero" : "unavailable" });
    });
    return () => { active = false; };
  }, [catalogReady, fallbackPublishedCount, key, region]);

  return { status, isZeroCoverage: status === "zero" };
}
