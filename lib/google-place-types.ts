import type { RestaurantCoordinates } from "@/types";

export type GooglePlaceCandidate = {
  placeId: string;
  name: string;
  address: string;
  city?: string;
  neighborhood?: string;
  region?: string;
  country?: string;
  coordinates?: RestaurantCoordinates;
  primaryType?: string;
  types: string[];
};
