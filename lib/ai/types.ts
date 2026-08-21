export type AiSearchIntent = {
  intent: "restaurant_recommendation";
  cuisines: string[];
  neighborhoods: string[];
  city: "Belo Horizonte" | "Nova Lima" | null;
  category: "restaurant" | "bar" | null;
  maxPricePerPerson: number | null;
  nearMe: boolean;
  occasions: string[];
  keywords: string[];
};

export type AiSearchPosition = { latitude: number; longitude: number };

export type AiRecommendation = {
  restaurantId: string;
  slug: string;
  reasons: string[];
  rating: number | null;
  reviewCount: number;
  distanceKm: number | null;
};

export type AiRecommendationResponse = {
  recommendations: AiRecommendation[];
  notices: string[];
  relaxedFilters: string[];
};
