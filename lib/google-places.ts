import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RestaurantRow } from "@/lib/supabase/database.types";

type PlacePhoto = {
  name: string;
  widthPx: number;
  heightPx: number;
  googleMapsUri?: string;
  authorAttributions?: Array<{
    displayName: string;
    uri: string;
    photoUri?: string;
  }>;
};

type PlaceDetails = {
  id: string;
  photos?: PlacePhoto[];
};

export type GooglePlaceConfig = Pick<RestaurantRow, "slug" | "name" | "google_place_id"> & {
  google_place_id: string;
};

const coverRequests = new Map<string, Promise<{ placeId: string; photo: PlacePhoto }>>();
const photoRequests = new Map<string, Promise<string>>();

function apiKey() {
  const value = process.env.GOOGLE_PLACES_API_KEY;
  if (!value) throw new Error("GOOGLE_PLACES_API_KEY não configurada.");
  return value;
}

function deduplicate<T>(requests: Map<string, Promise<T>>, key: string, request: () => Promise<T>) {
  const pending = requests.get(key);
  if (pending) return pending;
  const created = request();
  requests.set(key, created);
  created.then(
    () => requests.delete(key),
    () => requests.delete(key),
  );
  return created;
}

export async function getGooglePlaceConfig(slug: string): Promise<GooglePlaceConfig | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data, error } = await client
    .from("restaurants")
    .select("slug,name,google_place_id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data?.google_place_id) return null;
  return data as GooglePlaceConfig;
}

export function getGooglePlaceCover(config: GooglePlaceConfig) {
  return deduplicate(coverRequests, config.google_place_id, async () => {
    const response = await fetch(`https://places.googleapis.com/v1/places/${config.google_place_id}?languageCode=pt-BR`, {
      headers: {
        "X-Goog-Api-Key": apiKey(),
        "X-Goog-FieldMask": "id,photos",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) throw new Error(`Google Places retornou HTTP ${response.status}.`);
    const place = await response.json() as PlaceDetails;
    const photo = place.photos?.[0];
    if (!photo) throw new Error(`Nenhuma foto disponível para ${config.name}.`);
    return { placeId: config.google_place_id, photo };
  });
}

export function getGooglePlacePhotoUri(photoName: string, maxWidthPx: number) {
  const requestKey = `${photoName}:${maxWidthPx}`;
  return deduplicate(photoRequests, requestKey, async () => {
    const response = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&maxHeightPx=1200&skipHttpRedirect=true`, {
      headers: { "X-Goog-Api-Key": apiKey() },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) throw new Error(`Google Place Photos retornou HTTP ${response.status}.`);
    const media = await response.json() as { photoUri?: string };
    if (!media.photoUri) throw new Error("Google Place Photos não retornou uma URL temporária.");
    return media.photoUri;
  });
}
