import type { MichelinRecognition, Restaurant } from "@/types";

export const MICHELIN_RECOGNITION_STATES = ["unknown", "verified_starred", "verified_no_star", "needs_revalidation"] as const;
export type MichelinRecognitionState = (typeof MICHELIN_RECOGNITION_STATES)[number];

export function hasVerifiedMichelinStars(recognition: MichelinRecognition | undefined) {
  return recognition?.state === "verified_starred" && Boolean(recognition.stars && recognition.stars >= 1 && recognition.stars <= 3 && recognition.editionYear && recognition.sourceUrl);
}

export function hasVerifiedMichelinStarsForRestaurant(restaurant: Restaurant) {
  return hasVerifiedMichelinStars(restaurant.michelin);
}

export function michelinLabel(recognition: MichelinRecognition) {
  if (!hasVerifiedMichelinStars(recognition)) return null;
  return `${recognition.stars} ${recognition.stars === 1 ? "estrela" : "estrelas"} Michelin · edição ${recognition.editionYear}`;
}

export function isOfficialMichelinGuideUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "guide.michelin.com" || url.hostname.endsWith(".guide.michelin.com"));
  } catch {
    return false;
  }
}
