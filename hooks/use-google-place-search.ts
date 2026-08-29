"use client";

import { useCallback, useRef, useState } from "react";
import type { GooglePlaceCandidate } from "@/lib/google-place-types";
import type { RestaurantCoordinates } from "@/types";

type GooglePlacesResponse = { places?: GooglePlaceCandidate[]; error?: string };

async function requestPlaces(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as GooglePlacesResponse;
  if (!response.ok) throw new Error(payload.error ?? "Não conseguimos buscar lugares agora.");
  return payload.places ?? [];
}

/** Shared client boundary for explicit Google Places discovery flows. */
export function useGooglePlaceSearch() {
  const [places, setPlaces] = useState<GooglePlaceCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const searchPlaces = useCallback(async (query: string, position?: RestaurantCoordinates) => {
    const version = ++requestVersion.current;
    if (query.trim().length < 2) {
      setPlaces([]);
      return [];
    }
    setIsLoading(true);
    setError(null);
    try {
      const results = await requestPlaces("/api/google-places/search", { query, position });
      if (version !== requestVersion.current) return [];
      setPlaces(results);
      return results;
    } catch (reason) {
      if (version !== requestVersion.current) return [];
      const message = reason instanceof Error ? reason.message : "Não conseguimos buscar lugares agora.";
      setPlaces([]);
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
    try {
      const results = await requestPlaces("/api/google-places/nearby", { ...position });
      if (version !== requestVersion.current) return [];
      setPlaces(results);
      return results;
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
  }, []);

  return { places, isLoading, error, searchPlaces, searchNearby, clear };
}
