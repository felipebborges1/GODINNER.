"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RestaurantCoordinates } from "@/types";

export type ExploreLocationMode = "all" | "manual" | "device";
export type ExploreRegion = { placeId: string; city: string; region?: string; country?: string; countryCode?: string };
export type LocationRequestStatus = "idle" | "requesting" | "denied" | "unavailable" | "timeout";
type ExploreLocationContextValue = { mode: ExploreLocationMode; manualRegion: ExploreRegion | null; devicePosition: RestaurantCoordinates | null; requestStatus: LocationRequestStatus; label: string; selectManualRegion: (region: ExploreRegion) => void; requestDeviceLocation: () => Promise<boolean>; exploreAll: () => void };

const storageKey = "godinner.explore-region.v1";
const ExploreLocationContext = createContext<ExploreLocationContextValue | null>(null);
export const regionLabel = (region: ExploreRegion) => [region.city, region.region, region.country].filter(Boolean).join(", ");

export function ExploreLocationProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ExploreLocationMode>("all");
  const [manualRegion, setManualRegion] = useState<ExploreRegion | null>(null);
  const [devicePosition, setDevicePosition] = useState<RestaurantCoordinates | null>(null);
  const [requestStatus, setRequestStatus] = useState<LocationRequestStatus>("idle");
  const requestVersion = useRef(0);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (!saved) return;
        const region = JSON.parse(saved) as Partial<ExploreRegion>;
        if (!region.placeId || !region.city) return;
        setManualRegion({ placeId: region.placeId, city: region.city, region: region.region, country: region.country, countryCode: region.countryCode });
        setMode("manual");
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const selectManualRegion = useCallback((region: ExploreRegion) => { requestVersion.current += 1; setDevicePosition(null); setRequestStatus("idle"); setManualRegion(region); setMode("manual"); window.localStorage.setItem(storageKey, JSON.stringify(region)); }, []);
  const exploreAll = useCallback(() => { requestVersion.current += 1; setDevicePosition(null); setManualRegion(null); setRequestStatus("idle"); setMode("all"); window.localStorage.removeItem(storageKey); }, []);
  const requestDeviceLocation = useCallback(() => new Promise<boolean>((resolve) => {
    const requestId = ++requestVersion.current;
    if (!navigator.geolocation) { setRequestStatus("unavailable"); resolve(false); return; }
    setRequestStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { if (requestId !== requestVersion.current) return resolve(false); setDevicePosition({ latitude: coords.latitude, longitude: coords.longitude }); setMode("device"); setRequestStatus("idle"); resolve(true); },
      (error) => { if (requestId !== requestVersion.current) return resolve(false); setRequestStatus(error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "unavailable"); resolve(false); },
      { timeout: 10_000, maximumAge: 0, enableHighAccuracy: false },
    );
  }), []);
  const label = mode === "device" ? "Perto de você" : mode === "manual" && manualRegion ? `Em ${regionLabel(manualRegion)}` : "Onde você quer explorar?";
  const value = useMemo(() => ({ mode, manualRegion, devicePosition, requestStatus, label, selectManualRegion, requestDeviceLocation, exploreAll }), [devicePosition, label, manualRegion, mode, requestDeviceLocation, requestStatus, selectManualRegion, exploreAll]);
  return <ExploreLocationContext.Provider value={value}>{children}</ExploreLocationContext.Provider>;
}

export { ExploreLocationContext };
