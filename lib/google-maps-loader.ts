export type MapsFailure = "authorization" | "network" | "unavailable";
type MapsRuntime = { importLibrary: (name: string) => Promise<Record<string, unknown>> };
type MapsHost = { google?: { maps?: MapsRuntime }; gm_authFailure?: () => void; __godinnerMapsReady?: () => void };

// One loader for Discover and review entry, including authentication failures
// reported AFTER the script has loaded. Never log the script URL or API key.
export function createGoogleMapsLoader(host: MapsHost, doc: Pick<Document, "createElement" | "querySelector" | "head">) {
  let promise: Promise<MapsRuntime> | undefined;
  let failure: MapsFailure | undefined;
  let rejectPending: ((error: Error) => void) | undefined;
  const subscribers = new Set<(failure: MapsFailure) => void>();
  const fail = (reason: MapsFailure) => {
    failure = reason;
    rejectPending?.(new Error(`Maps ${reason}`));
    subscribers.forEach((listener) => listener(reason));
  };
  const previousAuthFailure = host.gm_authFailure;
  host.gm_authFailure = () => {
    fail("authorization");
    previousAuthFailure?.();
  };

  return {
    subscribe(listener: (failure: MapsFailure) => void) {
      subscribers.add(listener);
      if (failure) listener(failure);
      return () => { subscribers.delete(listener); };
    },
    load(apiKey?: string): Promise<MapsRuntime> {
      if (failure) return Promise.reject(new Error(`Maps ${failure}`));
      if (!apiKey) { fail("unavailable"); return Promise.reject(new Error("Maps unavailable")); }
      if (promise) return promise;
      if (host.google?.maps?.importLibrary) return Promise.resolve(host.google.maps);
      promise = new Promise<MapsRuntime>((resolve, reject) => {
        // This watchdog concerns script loading only, not GPS acquisition.
        const timer = setTimeout(() => fail("network"), 15_000);
        rejectPending = (error) => { clearTimeout(timer); reject(error); };
        host.__godinnerMapsReady = () => {
          clearTimeout(timer);
          if (failure) return;
          if (!host.google?.maps?.importLibrary) { fail("unavailable"); return; }
          resolve(host.google.maps);
        };
        // Do not inject a second SDK if another integration already owns it.
        if (doc.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
          fail("unavailable");
          return;
        }
        const script = doc.createElement("script");
        script.id = "godinner-google-maps";
        script.async = true;
        const params = new URLSearchParams({ key: apiKey, v: "weekly", language: "pt-BR", loading: "async", callback: "__godinnerMapsReady", auth_referrer_policy: "origin" });
        script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
        script.onerror = () => fail("network");
        doc.head.appendChild(script);
      });
      return promise;
    },
  };
}

let shared: ReturnType<typeof createGoogleMapsLoader> | undefined;
export function googleMapsLoader() {
  return shared ??= createGoogleMapsLoader(window as unknown as MapsHost, document);
}

export async function loadMapsLibraries(names: readonly string[]) {
  const maps = await googleMapsLoader().load(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.all(names.map((name) => maps.importLibrary(name))).then((libraries) => Object.assign({}, ...libraries) as Record<string, unknown>),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Maps libraries unavailable")), 15_000); }),
    ]);
  } finally { clearTimeout(timer); }
}
