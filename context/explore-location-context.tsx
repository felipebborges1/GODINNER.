"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RestaurantCoordinates } from "@/types";
import { createLocationRequestCoordinator, type LocationDiagnostic, type LocationRequestOrigin } from "@/lib/location/location-request-coordinator";

export type ExploreLocationMode = "all" | "manual" | "device";
export type ExploreRegion = { placeId: string; city: string; region?: string; country?: string; countryCode?: string };
export type LocationRequestStatus = "idle" | "requesting" | "denied" | "unavailable" | "timeout";
type ExploreLocationContextValue = { mode: ExploreLocationMode; manualRegion: ExploreRegion | null; devicePosition: RestaurantCoordinates | null; deviceRegion: ExploreRegion | null; requestStatus: LocationRequestStatus; label: string; locationNudgeVisible: boolean; locationDiagnostics: LocationDiagnostic[]; selectManualRegion: (region: ExploreRegion) => void; requestDeviceLocation: (origin?: LocationRequestOrigin) => Promise<boolean>; exploreAll: () => void; showLocationNudge: () => void; dismissLocationNudge: () => void };

const storageKey = "godinner.explore-region.v1";
const allChoiceSessionKey = "godinner.explore-region.all.v1";
const nudgeDismissedSessionKey = "godinner.location-nudge.dismissed.v1";
const ExploreLocationContext = createContext<ExploreLocationContextValue | null>(null);
export const regionLabel = (region: ExploreRegion) => [region.city, region.region, region.country].filter(Boolean).join(", ");

function locationDiagnosticsEnabled() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || /^godinner-beta-[a-z0-9]+-fbb4\.vercel\.app$/.test(window.location.hostname);
}

export function ExploreLocationProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ExploreLocationMode>("all");
  const [manualRegion, setManualRegion] = useState<ExploreRegion | null>(null);
  const [devicePosition, setDevicePosition] = useState<RestaurantCoordinates | null>(null);
  const [deviceRegion, setDeviceRegion] = useState<ExploreRegion | null>(null);
  const [requestStatus, setRequestStatus] = useState<LocationRequestStatus>("idle");
  const [explicitAll, setExplicitAll] = useState(false);
  const [locationNudgeVisible, setLocationNudgeVisible] = useState(false);
  const [restored, setRestored] = useState(false);
  const [locationDiagnostics, setLocationDiagnostics] = useState<LocationDiagnostic[]>([]);
  const diagnosticsEnabled = useRef(false);
  const coordinator = useRef<ReturnType<typeof createLocationRequestCoordinator> | null>(null);
  const visualUpdate = useRef<{ attemptId: string; origin: LocationRequestOrigin; startedAt: number } | null>(null);
  const permissionChecked = useRef(false);
  const deviceRegionRequest = useRef(0);

  const recordDiagnostic = useCallback((diagnostic: LocationDiagnostic) => {
    if (!diagnosticsEnabled.current) return;
    setLocationDiagnostics((current) => [...current, diagnostic].slice(-12));
    console.info("[GODINNER location]", diagnostic);
  }, []);

  useEffect(() => { diagnosticsEnabled.current = locationDiagnosticsEnabled(); }, []);

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

  const clearDeviceRegion = useCallback(() => { deviceRegionRequest.current += 1; setDeviceRegion(null); }, []);
  const selectManualRegion = useCallback((region: ExploreRegion) => { coordinator.current?.cancel(); clearDeviceRegion(); setDevicePosition(null); setRequestStatus("idle"); setExplicitAll(false); setManualRegion(region); setMode("manual"); window.sessionStorage.removeItem(allChoiceSessionKey); window.localStorage.setItem(storageKey, JSON.stringify(region)); }, [clearDeviceRegion]);
  const exploreAll = useCallback(() => { coordinator.current?.cancel(); clearDeviceRegion(); setDevicePosition(null); setManualRegion(null); setRequestStatus("idle"); setExplicitAll(true); setMode("all"); window.sessionStorage.setItem(allChoiceSessionKey, "true"); window.localStorage.removeItem(storageKey); }, [clearDeviceRegion]);
  const resolveCurrentDeviceRegion = useCallback((position: RestaurantCoordinates) => {
    const request = ++deviceRegionRequest.current;
    setDeviceRegion(null);
    void fetch("/api/location/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(position) })
      .then(async (response) => response.ok ? response.json() as Promise<{ region?: { city?: string; region?: string; country?: string; countryCode?: string } | null }> : null)
      .then((payload) => {
        const region = payload?.region;
        if (request !== deviceRegionRequest.current || !region?.city || !region.countryCode) return;
        setDeviceRegion({ placeId: `device:${region.countryCode}:${region.city}`, city: region.city, region: region.region, country: region.country, countryCode: region.countryCode });
      }).catch(() => undefined);
  }, []);
  const requestDeviceLocation = useCallback(async (origin: LocationRequestOrigin = "click") => {
    if (!coordinator.current) coordinator.current = createLocationRequestCoordinator({ getGeolocation: () => navigator.geolocation, onDiagnostic: recordDiagnostic });
    setRequestStatus("requesting");
    if (origin === "click" && navigator.permissions?.query) {
      const permissionStartedAt = performance.now();
      void navigator.permissions.query({ name: "geolocation" }).then((permission) => recordDiagnostic({ attemptId: "permission", origin, event: "joined", permission: permission.state, elapsedMs: Math.round(performance.now() - permissionStartedAt) })).catch(() => undefined);
    }
    const result = await coordinator.current.request(origin);
    if (!result.ok) {
      if (result.reason !== "cancelled") setRequestStatus(result.reason === "denied" ? "denied" : result.reason === "timeout" ? "timeout" : "unavailable");
      return false;
    }
    visualUpdate.current = { attemptId: result.attemptId, origin, startedAt: performance.now() };
    const position = { latitude: result.latitude, longitude: result.longitude };
    setDevicePosition(position); setExplicitAll(false); setMode("device"); setRequestStatus("idle"); window.sessionStorage.removeItem(allChoiceSessionKey); resolveCurrentDeviceRegion(position);
    return true;
  }, [recordDiagnostic, resolveCurrentDeviceRegion]);
  useEffect(() => {
    if (!visualUpdate.current || mode !== "device" || !devicePosition) return;
    recordDiagnostic({ attemptId: visualUpdate.current.attemptId, origin: visualUpdate.current.origin, event: "visual-updated", elapsedMs: Math.round(performance.now() - visualUpdate.current.startedAt), accepted: true });
    visualUpdate.current = null;
  }, [devicePosition, mode, recordDiagnostic]);
  useEffect(() => {
    if (!restored || permissionChecked.current || mode !== "all" || explicitAll || manualRegion || !navigator.permissions?.query) return;
    permissionChecked.current = true;
    const permissionStartedAt = performance.now();
    void navigator.permissions.query({ name: "geolocation" }).then((permission) => {
      recordDiagnostic({ attemptId: "permission", origin: "automatic", event: "joined", permission: permission.state, elapsedMs: Math.round(performance.now() - permissionStartedAt) });
      if (permission.state === "granted") void requestDeviceLocation("automatic");
      if (permission.state === "denied") setRequestStatus("denied");
    }).catch(() => undefined);
  }, [explicitAll, manualRegion, mode, recordDiagnostic, requestDeviceLocation, restored]);
  const showLocationNudge = useCallback(() => {
    if (mode !== "all" || explicitAll || requestStatus === "denied" || window.sessionStorage.getItem(nudgeDismissedSessionKey) === "true") return;
    setLocationNudgeVisible(true);
  }, [explicitAll, mode, requestStatus]);
  const dismissLocationNudge = useCallback(() => { setLocationNudgeVisible(false); window.sessionStorage.setItem(nudgeDismissedSessionKey, "true"); }, []);
  const label = mode === "device" ? "Perto de mim" : mode === "manual" && manualRegion ? [manualRegion.city, manualRegion.region || manualRegion.country].filter(Boolean).join(", ") : "Todas as regiões";
  const value = useMemo(() => ({ mode, manualRegion, devicePosition, deviceRegion, requestStatus, label, locationNudgeVisible, locationDiagnostics, selectManualRegion, requestDeviceLocation, exploreAll, showLocationNudge, dismissLocationNudge }), [devicePosition, deviceRegion, dismissLocationNudge, label, locationDiagnostics, locationNudgeVisible, manualRegion, mode, requestDeviceLocation, requestStatus, selectManualRegion, exploreAll, showLocationNudge]);
  return <ExploreLocationContext.Provider value={value}>{children}</ExploreLocationContext.Provider>;
}

export { ExploreLocationContext };
