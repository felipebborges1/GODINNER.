export type LocationRequestOrigin = "automatic" | "click";
export type LocationRequestFailure = "unsupported" | "denied" | "timeout" | "unavailable" | "cancelled" | "inaccurate";

export type LocationRequestResult =
  | { ok: true; attemptId: string; latitude: number; longitude: number; elapsedMs: number; accuracyMeters: number; positionAgeMs: number }
  | { ok: false; attemptId: string; reason: LocationRequestFailure; elapsedMs: number; errorCode?: number; errorMessage?: string };

export type LocationDiagnostic = {
  attemptId: string;
  origin: LocationRequestOrigin;
  event: "started" | "joined" | "succeeded" | "visual-updated" | "failed" | "cancelled" | "late-response";
  elapsedMs?: number;
  permission?: PermissionState | "unknown" | "unsupported";
  errorCode?: number;
  errorMessage?: string;
  accuracyMeters?: number;
  positionAgeMs?: number;
  accepted?: boolean;
};

type GeolocationApi = Pick<Geolocation, "getCurrentPosition">;
type PendingRequest = { attemptId: string; origin: LocationRequestOrigin; startedAt: number; promise: Promise<LocationRequestResult>; resolve: (result: LocationRequestResult) => void };

type Options = {
  getGeolocation: () => GeolocationApi | null | undefined;
  onDiagnostic?: (diagnostic: LocationDiagnostic) => void;
  now?: () => number;
  timeoutMs?: number;
  maximumAgeMs?: number;
  maximumAccuracyMeters?: number;
};

export function createLocationRequestCoordinator({ getGeolocation, onDiagnostic, now = Date.now, timeoutMs = 20_000, maximumAgeMs = 60_000, maximumAccuracyMeters = 5_000 }: Options) {
  let sequence = 0;
  let pending: PendingRequest | null = null;
  const emit = (diagnostic: LocationDiagnostic) => onDiagnostic?.(diagnostic);

  const cancel = () => {
    if (!pending) return;
    const active = pending;
    pending = null;
    const elapsedMs = now() - active.startedAt;
    emit({ attemptId: active.attemptId, origin: active.origin, event: "cancelled", elapsedMs, accepted: false });
    active.resolve({ ok: false, attemptId: active.attemptId, reason: "cancelled", elapsedMs });
  };

  const request = (origin: LocationRequestOrigin, permission: PermissionState | "unknown" | "unsupported" = "unknown") => {
    if (pending) {
      emit({ attemptId: pending.attemptId, origin, event: "joined", permission, elapsedMs: now() - pending.startedAt });
      return pending.promise;
    }

    const attemptId = `location-${++sequence}`;
    const startedAt = now();
    const geolocation = getGeolocation();
    if (!geolocation) {
      emit({ attemptId, origin, event: "failed", permission: "unsupported", elapsedMs: 0, accepted: false });
      return Promise.resolve<LocationRequestResult>({ ok: false, attemptId, reason: "unsupported", elapsedMs: 0 });
    }

    let resolve!: (result: LocationRequestResult) => void;
    const promise = new Promise<LocationRequestResult>((complete) => { resolve = complete; });
    const active: PendingRequest = { attemptId, origin, startedAt, promise, resolve };
    pending = active;
    emit({ attemptId, origin, event: "started", permission, elapsedMs: 0 });

    const fail = (reason: LocationRequestFailure, errorCode?: number, errorMessage?: string) => {
      const elapsedMs = now() - startedAt;
      if (pending !== active) {
        emit({ attemptId, origin, event: "late-response", elapsedMs, errorCode, errorMessage, accepted: false });
        return;
      }
      pending = null;
      emit({ attemptId, origin, event: "failed", elapsedMs, errorCode, errorMessage, accepted: false });
      resolve({ ok: false, attemptId, reason, elapsedMs, errorCode, errorMessage });
    };

    geolocation.getCurrentPosition(
      (position) => {
        const elapsedMs = now() - startedAt;
        const accuracyMeters = position.coords.accuracy;
        const positionAgeMs = Math.max(0, now() - position.timestamp);
        if (pending !== active) {
          emit({ attemptId, origin, event: "late-response", elapsedMs, accuracyMeters, positionAgeMs, accepted: false });
          return;
        }
        if (!Number.isFinite(accuracyMeters) || accuracyMeters > maximumAccuracyMeters) {
          pending = null;
          emit({ attemptId, origin, event: "failed", elapsedMs, accuracyMeters, positionAgeMs, accepted: false });
          resolve({ ok: false, attemptId, reason: "inaccurate", elapsedMs });
          return;
        }
        pending = null;
        emit({ attemptId, origin, event: "succeeded", elapsedMs, accuracyMeters, positionAgeMs, accepted: true });
        resolve({ ok: true, attemptId, latitude: position.coords.latitude, longitude: position.coords.longitude, elapsedMs, accuracyMeters, positionAgeMs });
      },
      (error) => fail(error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable", error.code, error.message),
      { timeout: timeoutMs, maximumAge: maximumAgeMs, enableHighAccuracy: false },
    );
    return promise;
  };

  return { request, cancel };
}
