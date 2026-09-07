"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RestaurantCoordinates } from "@/types";

export type ExploreLocationMode = "all" | "manual" | "device";
export type ExploreRegion = { placeId: string; city: string; region?: string; country?: string; countryCode?: string };
export type LocationRequestStatus = "idle" | "requesting" | "denied" | "unavailable" | "timeout";
type ExploreLocationContextValue = { mode: ExploreLocationMode; manualRegion: ExploreRegion | null; devicePosition: RestaurantCoordinates | null; requestStatus: LocationRequestStatus; label: string; locationNudgeVisible: boolean; selectManualRegion: (region: ExploreRegion) => void; requestDeviceLocation: () => Promise<boolean>; exploreAll: () => void; showLocationNudge: () => void; dismissLocationNudge: () => void };

const storageKey = "godinner.explore-region.v1";
const allChoiceSessionKey = "godinner.explore-region.all.v1";
const nudgeDismissedSessionKey = "godinner.location-nudge.dismissed.v1";
const ExploreLocationContext = createContext<ExploreLocationContextValue | null>(null);
export const regionLabel = (region: ExploreRegion) => [region.city, region.region, region.country].filter(Boolean).join(", ");

export function ExploreLocationProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ExploreLocationMode>("all");
  const [manualRegion, setManualRegion] = useState<ExploreRegion | null>(null);
  const [devicePosition, setDevicePosition] = useState<RestaurantCoordinates | null>(null);
  const [requestStatus, setRequestStatus] = useState<LocationRequestStatus>("idle");
  const [explicitAll, setExplicitAll] = useState(false);
  const [locationNudgeVisible, setLocationNudgeVisible] = useState(false);
  const [restored, setRestored] = useState(false);
  const requestVersion = useRef(0);
  const permissionChecked = useRef(false);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const region = JSON.parse(saved) as Partial<ExploreRegion>;
          if (region.placeId && region.city) {
            setManualRegion({ placeId: region.placeId, city: region.city, region: region.region, country: region.country, countryCode: region.countryCode });
            setMode("manual");
          }
        } else if (window.sessionStorage.getItem(allChoiceSessionKey) === "true") {
          setExplicitAll(true);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      } finally {
        setRestored(true);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const selectManualRegion = useCallback((region: ExploreRegion) => { requestVersion.current += 1; setDevicePosition(null); setRequestStatus("idle"); setExplicitAll(false); setManualRegion(region); setMode("manual"); window.sessionStorage.removeItem(allChoiceSessionKey); window.localStorage.setItem(storageKey, JSON.stringify(region)); }, []);
  const exploreAll = useCallback(() => { requestVersion.current += 1; setDevicePosition(null); setManualRegion(null); setRequestStatus("idle"); setExplicitAll(true); setMode("all"); window.sessionStorage.setItem(allChoiceSessionKey, "true"); window.localStorage.removeItem(storageKey); }, []);
  const requestDeviceLocation = useCallback(() => new Promise<boolean>((resolve) => {
    const requestId = ++requestVersion.current;
    if (!navigator.geolocation) { setRequestStatus("unavailable"); resolve(false); return; }
    setRequestStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { if (requestId !== requestVersion.current) return resolve(false); setDevicePosition({ latitude: coords.latitude, longitude: coords.longitude }); setExplicitAll(false); setMode("device"); setRequestStatus("idle"); window.sessionStorage.removeItem(allChoiceSessionKey); resolve(true); },
      (error) => { if (requestId !== requestVersion.current) return resolve(false); setRequestStatus(error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "unavailable"); resolve(false); },
      { timeout: 10_000, maximumAge: 0, enableHighAccuracy: false },
    );
  }), []);
  useEffect(() => {
    if (!restored || permissionChecked.current || mode !== "all" || explicitAll || manualRegion || !navigator.permissions?.query) return;
    permissionChecked.current = true;
    void navigator.permissions.query({ name: "geolocation" }).then((permission) => {
      if (permission.state === "granted") void requestDeviceLocation();
      if (permission.state === "denied") setRequestStatus("denied");
    }).catch(() => undefined);
  }, [explicitAll, manualRegion, mode, requestDeviceLocation, restored]);
  const showLocationNudge = useCallback(() => {
    if (mode !== "all" || explicitAll || requestStatus === "denied" || window.sessionStorage.getItem(nudgeDismissedSessionKey) === "true") return;
    setLocationNudgeVisible(true);
  }, [explicitAll, mode, requestStatus]);
  const dismissLocationNudge = useCallback(() => { setLocationNudgeVisible(false); window.sessionStorage.setItem(nudgeDismissedSessionKey, "true"); }, []);
  const label = mode === "device" ? "Perto de mim" : mode === "manual" && manualRegion ? [manualRegion.city, manualRegion.region || manualRegion.country].filter(Boolean).join(", ") : "Todas as regiões";
  const value = useMemo(() => ({ mode, manualRegion, devicePosition, requestStatus, label, locationNudgeVisible, selectManualRegion, requestDeviceLocation, exploreAll, showLocationNudge, dismissLocationNudge }), [devicePosition, dismissLocationNudge, label, locationNudgeVisible, manualRegion, mode, requestDeviceLocation, requestStatus, selectManualRegion, exploreAll, showLocationNudge]);
  return <ExploreLocationContext.Provider value={value}>{children}</ExploreLocationContext.Provider>;
}

export { ExploreLocationContext };
