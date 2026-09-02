import type { Follow, Restaurant, RestaurantCoordinates, RestaurantList, Review } from "@/types";

/**
 * Deterministic recommendation foundation for the Beta. Keeping the weights in
 * one place makes it possible to tune the model with product evidence later.
 * Early users rely more on network and catalog quality; mature users rely more
 * on their own rating history.
 */
export const RECOMMENDATION_RANKING_CONFIG = {
  early: {
    taste: 24,
    social: 28,
    intent: 22,
    quality: 20,
    proximity: 3,
    priceCompatibility: 1,
    likedReview: 1,
    novelty: 1,
  },
  personalized: {
    taste: 45,
    social: 18,
    intent: 15,
    quality: 15,
    proximity: 3,
    priceCompatibility: 2,
    likedReview: 1,
    novelty: 1,
  },
  diversity: { maxConsecutivePrimaryCuisine: 2 },
} as const;

export type RecommendationMaturity = "locked" | "early" | "personalized";
export type RecommendationReasonType = "taste" | "social" | "want_to_visit" | "list" | "quality" | "proximity" | "price" | "liked_review" | "novelty";

export type RecommendationLike = { userId: string; reviewId: string };

export type RecommendationSignals = {
  taste: number;
  social: number;
  intent: number;
  quality: number;
  proximity: number;
  priceCompatibility: number;
  likedReview: number;
  novelty: number;
};

export type Recommendation = {
  restaurant: Restaurant;
  score: number;
  reason: string;
  reasonType: RecommendationReasonType;
  signals: RecommendationSignals;
};

export type RecommendationTaste = { cuisine: string; score: number; confidence: number; reviewCount: number };

export type RecommendationProfile = {
  maturity: RecommendationMaturity;
  validReviewCount: number;
  tastes: RecommendationTaste[];
};

export type RecommendationInput = {
  currentUserId: string;
  restaurants: Restaurant[];
  reviews: Review[];
  follows?: Follow[];
  likes?: RecommendationLike[];
  lists?: RestaurantList[];
  location?: RestaurantCoordinates | null;
  limit?: number;
};

export type RecommendationResult = {
  maturity: RecommendationMaturity;
  eligible: boolean;
  profile: RecommendationProfile;
  recommendations: Recommendation[];
};

type CandidateScore = Recommendation & { primaryCuisine: string; contributions: Record<RecommendationReasonType, number> };
type IntentKind = "want" | "list" | null;
type WeightKey = keyof RecommendationSignals;

const emptySignals = (): RecommendationSignals => ({ taste: 0, social: 0, intent: 0, quality: 0, proximity: 0, priceCompatibility: 0, likedReview: 0, novelty: 0 });

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
}

function validScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5;
}

function validSpend(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function maturityFor(validReviewCount: number): RecommendationMaturity {
  if (validReviewCount < 3) return "locked";
  return validReviewCount < 8 ? "early" : "personalized";
}

function distanceInKm(a: RestaurantCoordinates, b: RestaurantCoordinates) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function hasCoordinates(value: RestaurantCoordinates | undefined | null): value is RestaurantCoordinates {
  return Boolean(value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude));
}

function profileTaste(userReviews: Review[], restaurantById: Map<string, Restaurant>): RecommendationTaste[] {
  const signals = new Map<string, { cuisine: string; ratings: number[] }>();
  for (const review of userReviews) {
    const restaurant = restaurantById.get(review.restaurantId);
    if (!restaurant || !validScore(review.rating)) continue;
    for (const cuisine of restaurant.cuisine) {
      const key = normalize(cuisine);
      if (!key) continue;
      const current = signals.get(key) ?? { cuisine, ratings: [] };
      current.ratings.push(review.rating);
      signals.set(key, current);
    }
  }
  return [...signals.values()].map(({ cuisine, ratings }) => {
    const rating = average(ratings) ?? 0;
    // A single experience can inform the profile, but has deliberately low confidence.
    const confidence = Math.min(ratings.length / 3, 1);
    return { cuisine, score: Math.max(0, (rating - 3) / 2) * confidence * 100, confidence, reviewCount: ratings.length };
  }).sort((a, b) => b.score - a.score || b.reviewCount - a.reviewCount || a.cuisine.localeCompare(b.cuisine));
}

function tasteSignal(restaurant: Restaurant, tastes: RecommendationTaste[]) {
  const byCuisine = new Map(tastes.map((taste) => [normalize(taste.cuisine), taste]));
  const matched = restaurant.cuisine.map((cuisine) => byCuisine.get(normalize(cuisine))).filter((taste): taste is RecommendationTaste => Boolean(taste));
  return { score: Math.max(0, ...matched.map((taste) => taste.score)), cuisine: matched.sort((a, b) => b.score - a.score)[0]?.cuisine ?? null };
}

function ratingSignal(reviews: Review[], restaurantId: string) {
  const scores = reviews.filter((review) => review.restaurantId === restaurantId && validScore(review.rating)).map((review) => review.rating);
  const rating = average(scores);
  if (rating === null) return 0;
  return (rating / 5) * Math.min(scores.length / 3, 1) * 100;
}

function socialSignal(reviews: Review[], restaurantId: string, followedUserIds: Set<string>) {
  const scores = reviews
    .filter((review) => review.restaurantId === restaurantId && followedUserIds.has(review.userId) && validScore(review.rating))
    .map((review) => review.rating);
  const rating = average(scores);
  if (rating === null) return 0;
  return Math.max(0, (rating - 2.5) / 2.5) * Math.min(scores.length / 3, 1) * 100;
}

function priceCompatibilitySignal(userReviews: Review[], reviews: Review[], restaurantId: string) {
  const userSpendByCurrency = new Map<string, number[]>();
  for (const review of userReviews) {
    if (!validSpend(review.amountPerPerson) || !review.currency) continue;
    const currency = review.currency.toUpperCase();
    userSpendByCurrency.set(currency, [...(userSpendByCurrency.get(currency) ?? []), review.amountPerPerson]);
  }
  if (!userSpendByCurrency.size) return 0;

  const candidateSpendByCurrency = new Map<string, number[]>();
  for (const review of reviews) {
    if (review.restaurantId !== restaurantId || !validSpend(review.amountPerPerson) || !review.currency) continue;
    const currency = review.currency.toUpperCase();
    candidateSpendByCurrency.set(currency, [...(candidateSpendByCurrency.get(currency) ?? []), review.amountPerPerson]);
  }

  let best = 0;
  for (const [currency, userAmounts] of userSpendByCurrency) {
    const candidateAmounts = candidateSpendByCurrency.get(currency);
    if (!candidateAmounts?.length) continue;
    const userAverage = average(userAmounts);
    const candidateAverage = average(candidateAmounts);
    if (!userAverage || !candidateAverage) continue;
    const relativeDifference = Math.abs(userAverage - candidateAverage) / Math.max(userAverage, 1);
    best = Math.max(best, Math.max(0, 100 - relativeDifference * 100));
  }
  return best;
}

function intentFor(restaurantId: string, userLists: RestaurantList[]): IntentKind {
  if (userLists.some((list) => list.type === "want" && list.restaurantIds.includes(restaurantId))) return "want";
  if (userLists.some((list) => (list.type === "favorites" || list.type === "custom") && list.restaurantIds.includes(restaurantId))) return "list";
  return null;
}

function reasonFor(contributions: Record<RecommendationReasonType, number>, cuisine: string | null): Pick<Recommendation, "reason" | "reasonType"> {
  const ordered = (Object.entries(contributions) as Array<[RecommendationReasonType, number]>).sort((a, b) => b[1] - a[1]);
  const [reasonType] = ordered.find(([, contribution]) => contribution > 0) ?? ["novelty"];
  const messages: Record<RecommendationReasonType, string> = {
    taste: cuisine ? `Porque você costuma avaliar bem restaurantes ${cuisine}.` : "Combina com experiências que você avaliou bem.",
    social: "Bem avaliado por pessoas que você segue.",
    want_to_visit: "Está na sua lista Quero conhecer.",
    list: "Está em uma das suas listas.",
    quality: "Bem avaliado pela comunidade GODINNER.",
    proximity: "Fica próximo da sua localização informada.",
    price: "Compatível com gastos em experiências na mesma moeda.",
    liked_review: "Você curtiu uma experiência neste lugar.",
    novelty: "Um novo lugar para você conhecer.",
  };
  return { reasonType, reason: messages[reasonType] };
}

function primaryCuisine(restaurant: Restaurant) {
  return normalize(restaurant.cuisine[0] ?? "") || `restaurant:${restaurant.id}`;
}

function diversify(candidates: CandidateScore[], limit: number) {
  const remaining = [...candidates];
  const selected: CandidateScore[] = [];
  while (remaining.length && selected.length < limit) {
    const recent = selected.slice(-RECOMMENDATION_RANKING_CONFIG.diversity.maxConsecutivePrimaryCuisine).map((candidate) => candidate.primaryCuisine);
    const index = remaining.findIndex((candidate) => !recent.length || recent.some((cuisine) => cuisine !== candidate.primaryCuisine));
    selected.push(remaining.splice(index === -1 ? 0 : index, 1)[0]);
  }
  return selected;
}

/**
 * Returns only catalog restaurants, scores each signal independently, and keeps
 * the output observable for future recommendation impression/click events.
 */
export function generateRecommendations(input: RecommendationInput): RecommendationResult {
  const restaurantById = new Map(input.restaurants.map((restaurant) => [restaurant.id, restaurant]));
  const userReviews = input.reviews.filter((review) => review.userId === input.currentUserId && validScore(review.rating));
  const maturity = maturityFor(userReviews.length);
  const tastes = profileTaste(userReviews, restaurantById);
  const profile: RecommendationProfile = { maturity, validReviewCount: userReviews.length, tastes };
  if (maturity === "locked") return { maturity, eligible: false, profile, recommendations: [] };

  const weights = RECOMMENDATION_RANKING_CONFIG[maturity];
  const reviewedRestaurantIds = new Set(userReviews.map((review) => review.restaurantId));
  const followedUserIds = new Set((input.follows ?? []).filter((follow) => follow.followerId === input.currentUserId).map((follow) => follow.followingId));
  const likedReviewIds = new Set((input.likes ?? []).filter((like) => like.userId === input.currentUserId).map((like) => like.reviewId));
  const userLists = (input.lists ?? []).filter((list) => list.ownerId === input.currentUserId);
  const uniqueCandidates = new Map<string, Restaurant>();

  for (const restaurant of input.restaurants) {
    if (restaurant.status !== "published" || reviewedRestaurantIds.has(restaurant.id) || !restaurant.name.trim() || !restaurant.slug.trim() || !restaurant.cuisine.length) continue;
    uniqueCandidates.set(restaurant.id, restaurant);
  }

  const candidates = [...uniqueCandidates.values()].map((restaurant): CandidateScore => {
    const signals = emptySignals();
    const taste = tasteSignal(restaurant, tastes);
    signals.taste = taste.score;
    signals.social = socialSignal(input.reviews, restaurant.id, followedUserIds);
    const intent = intentFor(restaurant.id, userLists);
    signals.intent = intent === "want" ? 100 : intent === "list" ? 35 : 0;
    signals.quality = ratingSignal(input.reviews, restaurant.id);
    if (input.location && hasCoordinates(restaurant.coordinates)) signals.proximity = Math.max(0, 100 - (distanceInKm(input.location, restaurant.coordinates) / 30) * 100);
    signals.priceCompatibility = priceCompatibilitySignal(userReviews, input.reviews, restaurant.id);
    signals.likedReview = input.reviews.some((review) => review.restaurantId === restaurant.id && likedReviewIds.has(review.id)) ? 100 : 0;
    signals.novelty = 100;

    const contributions: Record<RecommendationReasonType, number> = {
      taste: signals.taste * weights.taste,
      social: signals.social * weights.social,
      want_to_visit: intent === "want" ? signals.intent * weights.intent : 0,
      list: intent === "list" ? signals.intent * weights.intent : 0,
      quality: signals.quality * weights.quality,
      proximity: signals.proximity * weights.proximity,
      price: signals.priceCompatibility * weights.priceCompatibility,
      liked_review: signals.likedReview * weights.likedReview,
      novelty: signals.novelty * weights.novelty,
    };
    const reason = reasonFor(contributions, taste.cuisine);
    const score = Object.values(contributions).reduce((total, contribution) => total + contribution, 0) / 100;
    return { restaurant, score: Number(score.toFixed(2)), ...reason, signals, primaryCuisine: primaryCuisine(restaurant), contributions };
  }).sort((a, b) => b.score - a.score || a.restaurant.name.localeCompare(b.restaurant.name));

  const limit = Math.max(1, Math.min(input.limit ?? 10, 20));
  const recommendations = diversify(candidates, limit).map(({ primaryCuisine: _primaryCuisine, contributions: _contributions, ...recommendation }) => recommendation);
  return { maturity, eligible: true, profile, recommendations };
}
