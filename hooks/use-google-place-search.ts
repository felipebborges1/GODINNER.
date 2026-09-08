"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GooglePlaceCandidate } from "@/lib/google-place-types";
import type { RestaurantCoordinates } from "@/types";

type GooglePlacesResponse = { places?: GooglePlaceCandidate[]; error?: string; code?: string; retryAfterSeconds?: number; diagnostics?: GoogleSearchDiagnostics };
export type GoogleSearchDiagnostics = { attemptId?: string; source?: "automatic" | "manual" | "retry"; manualRegionType?: "city" | "state" | "country" | "unknown"; hasPosition: boolean; durationMs: number; routeStatus: number; failureCode?: string; upstreamStatus?: number; networkCode?: string };
type SearchOptions = { position?: RestaurantCoordinates; diagnostic?: { attemptId: string; source: "automatic" | "manual" | "retry"; manualRegionType?: "city" | "state" | "country" | "unknown" } };
type GooglePlacesSearchError = Error & { retryAfterSeconds?: number; diagnostics?: GoogleSearchDiagnostics };

function normalizeSearchOptions(options: SearchOptions | RestaurantCoordinates | undefined): SearchOptions {
  return options && "latitude" in options ? { position: options } : options ?? {};
}

async function requestPlaces(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let payload: GooglePlacesResponse;
  try {
    payload = await response.json() as GooglePlacesResponse;
  } catch {
    throw new Error("Não conseguimos buscar lugares agora.");
  }
  if (!response.ok) {
    const error = new Error(payload.error ?? "Não conseguimos buscar lugares agora.") as GooglePlacesSearchError;
    error.retryAfterSeconds = payload.retryAfterSeconds;
    error.diagnostics = payload.diagnostics;
    throw error;
  }
  return { places: payload.places ?? [], diagnostics: payload.diagnostics };
}

/** Shared client boundary for explicit Google Places discovery flows. */
export function useGooglePlaceSearch() {
  const [places, setPlaces] = useState<GooglePlaceCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [diagnostics, setDiagnostics] = useState<GoogleSearchDiagnostics | null>(null);
  const [resultQuery, setResultQuery] = useState<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    if (!retryAfterSeconds) return;
    const timer = window.setTimeout(() => setRetryAfterSeconds((remaining) => remaining && remaining > 1 ? remaining - 1 : null), 1_000);
    return () => window.clearTimeout(timer);
  }, [retryAfterSeconds]);

  const searchPlaces = useCallback(async (query: string, input?: SearchOptions | RestaurantCoordinates) => {
    const options = normalizeSearchOptions(input);
    const version = ++requestVersion.current;
    if (query.trim().length < 2) {
      setPlaces([]);
      return [];
    }
    setIsLoading(true);
    setError(null);
    setRetryAfterSeconds(null);
    try {
      const result = await requestPlaces("/api/google-places/search", { query, position: options.position, diagnostic: options.diagnostic });
      if (version !== requestVersion.current) return [];
      setPlaces(result.places);
      setResultQuery(query.trim());
      setDiagnostics(result.diagnostics ?? null);
      return result.places;
    } catch (reason) {
      if (version !== requestVersion.current) return [];
      const typedReason = reason instanceof Error ? reason as GooglePlacesSearchError : undefined;
      const message = typedReason?.message ?? "Não conseguimos buscar lugares agora.";
      setRetryAfterSeconds(typedReason?.retryAfterSeconds ?? null);
      setDiagnostics(typedReason?.diagnostics ?? null);
      setError(message);
      return [];
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, []);

  const searchNearby = useCallback(async (position: RestaurantCoordinates) => {
    const version = ++requestVersion.current;
    setIsLoading(true);
    setError(null);
    setRetryAfterSeconds(null);
    try {
      const results = await requestPlaces("/api/google-places/nearby", { ...position });
      if (version !== requestVersion.current) return [];
      setPlaces(results.places);
      setResultQuery("nearby");
      return results.places;
    } catch (reason) {
      if (version !== requestVersion.current) return [];
      const message = reason instanceof Error ? reason.message : "Não conseguimos encontrar lugares próximos agora.";
      setPlaces([]);
      setError(message);
      return [];
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    requestVersion.current += 1;
    setPlaces([]);
    setIsLoading(false);
    setError(null);
    setRetryAfterSeconds(null);
    setDiagnostics(null);
    setResultQuery(null);
  }, []);

  return { places, resultQuery, isLoading, error, retryAfterSeconds, diagnostics, searchPlaces, searchNearby, clear };
}
