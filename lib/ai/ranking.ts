import { distanceKm, FALLBACK_COORDINATES, hasCoordinates } from "@/lib/distance";
import { calculateCommunitySpend, formatCommunitySpend, type CommunitySpend } from "@/lib/community-spend";
import { normalize } from "@/lib/search";
import { averageReviewScore } from "@/lib/review-rating";
import type { Restaurant, Review } from "@/types";
import { restaurantMatchesCuisine } from "./cuisine";
import type { AiRecommendation, AiRecommendationResponse, AiSearchIntent, AiSearchPosition } from "./types";

type RankingInput = { restaurants: Restaurant[]; reviews: Review[]; intent: AiSearchIntent; position?: AiSearchPosition | null };

const priceNotice = "O orçamento é usado como sinal de compatibilidade. Gastos informados pela comunidade não são uma garantia de preço.";

function restaurantText(restaurant: Restaurant) {
  return normalize([restaurant.name, restaurant.address, restaurant.neighborhood, restaurant.city, restaurant.category, restaurant.chef, ...restaurant.cuisine].join(" "));
}

function ratingFor(reviews: Review[], restaurantId: string) {
  const restaurantReviews = reviews.filter((review) => review.restaurantId === restaurantId);
  return { rating: averageReviewScore(restaurantReviews), reviewCount: restaurantReviews.length };
}

function candidateReasons(restaurant: Restaurant, intent: AiSearchIntent, rating: number | null, distance: number | null, communitySpend: CommunitySpend | null) {
  const reasons: string[] = [];
  const matchingCuisine = intent.cuisines.find((cuisine) => restaurantMatchesCuisine(restaurant.cuisine, cuisine));
  if (matchingCuisine) reasons.push(`${restaurant.cuisine.find((cuisine) => restaurantMatchesCuisine([cuisine], matchingCuisine)) ?? matchingCuisine} compatível`);
  if (intent.neighborhoods.some((neighborhood) => normalize(neighborhood) === normalize(restaurant.neighborhood))) reasons.push(`${restaurant.neighborhood} compatível`);
  else if (intent.city === restaurant.city) reasons.push(`${restaurant.city} compatível`);
  if (intent.nearMe && distance !== null) reasons.push(`${distance.toFixed(1).replace(".", ",")} km de referência`);
  if (intent.maxPricePerPerson !== null && communitySpend?.currency === "BRL" && communitySpend.average <= intent.maxPricePerPerson) reasons.push(`Gasto informado pela comunidade em torno de ${formatCommunitySpend(communitySpend.average, communitySpend.currency)} por pessoa`);
  if (rating !== null) reasons.push(`nota GODINNER ${rating.toFixed(1)}`);
  if (!reasons.length) reasons.push("opção do catálogo GODINNER");
  return reasons.slice(0, 3);
}

export function rankAiRecommendations({ restaurants, reviews, intent, position }: RankingInput): AiRecommendationResponse {
  const notices: string[] = [];
  const relaxedFilters: string[] = [];
  const catalog = restaurants.filter((restaurant) => restaurant.status === "published");
  const origin = intent.nearMe ? (position ?? FALLBACK_COORDINATES) : null;
  if (intent.nearMe && !position) notices.push("Não recebemos sua localização; ordenamos pela referência de Vila da Serra.");
  if (intent.maxPricePerPerson !== null) notices.push(priceNotice);
  if (intent.occasions.length) notices.push("O catálogo ainda não possui atributos confiáveis de ocasião; esse pedido não foi usado como filtro.");

  const knownCuisine = intent.cuisines.length === 0 || intent.cuisines.some((term) => catalog.some((restaurant) => restaurantMatchesCuisine(restaurant.cuisine, term)));
  const knownNeighborhood = intent.neighborhoods.length === 0 || intent.neighborhoods.some((term) => catalog.some((restaurant) => normalize(restaurant.neighborhood) === normalize(term)));
  const knownKeywords = intent.keywords.filter((term) => catalog.some((restaurant) => restaurantText(restaurant).includes(normalize(term))));
  if (intent.keywords.length && !knownKeywords.length) notices.push("Parte do que você pediu não pode ser verificada com os dados atuais do catálogo.");

  const matches = (restaurant: Restaurant, includeNeighborhood: boolean) =>
    (!intent.city || restaurant.city === intent.city) &&
    (!intent.category || restaurant.category === intent.category) &&
    (!intent.cuisines.length || intent.cuisines.some((term) => restaurantMatchesCuisine(restaurant.cuisine, term))) &&
    (!includeNeighborhood || !intent.neighborhoods.length || intent.neighborhoods.some((term) => normalize(restaurant.neighborhood) === normalize(term)));

  let candidates = knownCuisine ? catalog.filter((restaurant) => matches(restaurant, true)) : [];
  if (!candidates.length && knownCuisine && intent.neighborhoods.length && !knownNeighborhood) {
    candidates = catalog.filter((restaurant) => matches(restaurant, false));
    if (candidates.length) {
      relaxedFilters.push(`bairro “${intent.neighborhoods.join(", ")}”`);
      notices.push(`Não encontramos uma combinação exata. Mostramos opções próximas após relaxar o filtro de ${relaxedFilters[0]}.`);
    }
  }
  if (!candidates.length) return { recommendations: [], notices: ["Não encontramos uma combinação exata.", ...notices], relaxedFilters };

  const scored = candidates.map((restaurant) => {
    const { rating, reviewCount } = ratingFor(reviews, restaurant.id);
    const communitySpend = calculateCommunitySpend(reviews.filter((review) => review.restaurantId === restaurant.id));
    const distance = origin && hasCoordinates(restaurant.coordinates) ? distanceKm(origin, restaurant.coordinates) : null;
    let score = 0;
    if (intent.cuisines.some((term) => restaurantMatchesCuisine(restaurant.cuisine, term))) score += 100;
    if (intent.city === restaurant.city) score += 45;
    if (intent.neighborhoods.some((term) => normalize(term) === normalize(restaurant.neighborhood))) score += 70;
    if (intent.category === restaurant.category) score += 20;
    if (distance !== null) score += Math.max(0, 35 - distance * 3);
    score += knownKeywords.filter((term) => restaurantText(restaurant).includes(normalize(term))).length * 8;
    if (rating !== null) score += rating * 4 + Math.min(reviewCount, 10);
    if (intent.maxPricePerPerson !== null && communitySpend?.currency === "BRL" && communitySpend.average <= intent.maxPricePerPerson) score += 25;
    return { restaurant, rating, reviewCount, distance, communitySpend, score };
  }).sort((a, b) => b.score - a.score || (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY) || a.restaurant.name.localeCompare(b.restaurant.name));

  const recommendations: AiRecommendation[] = scored.slice(0, 5).map(({ restaurant, rating, reviewCount, distance, communitySpend }) => ({
    restaurantId: restaurant.id,
    slug: restaurant.slug,
    reasons: candidateReasons(restaurant, intent, rating, distance, communitySpend),
    rating,
    reviewCount,
    distanceKm: distance === null ? null : Number(distance.toFixed(1)),
  }));
  return { recommendations, notices, relaxedFilters };
}
