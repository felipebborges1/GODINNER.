import { getDimensionalReviewScore } from "./review-rating.ts";

export const REVIEW_CRITERIA_VERSION = 1 as const;

export const REVIEW_TOPICS = {
  food: {
    label: "Comida",
    criteria: [
      ["taste", "Sabor", "Tempero, equilíbrio e combinação dos sabores."],
      ["texture", "Ponto e textura", "Preparo adequado: maciez, crocância, suculência e ponto."],
      ["temperature", "Temperatura", "O prato chegou na temperatura adequada à proposta?"],
      ["presentation", "Apresentação", "Cuidado na montagem e apresentação do prato."],
    ],
  },
  ambience: {
    label: "Ambiente",
    criteria: [
      ["comfort", "Conforto", "Assentos, espaço e temperatura do ambiente."],
      ["cleanliness", "Limpeza", "Limpeza percebida nas mesas, salão e banheiros utilizados."],
      ["sound", "Som e ruído", "Volume da música e barulho adequados à proposta do lugar."],
      ["atmosphere", "Atmosfera", "Iluminação, decoração e sensação geral do espaço."],
    ],
  },
  service: {
    label: "Serviço",
    criteria: [
      ["courtesy", "Cordialidade", "Educação, respeito e acolhimento."],
      ["attention", "Atenção", "Disponibilidade da equipe e acompanhamento da mesa."],
      ["speed", "Agilidade", "Tempo de atendimento, pedidos e conta, considerando o contexto."],
      ["order_accuracy", "Precisão dos pedidos", "Pratos, bebidas, observações e conta vieram corretamente?"],
    ],
  },
} as const;

export type ReviewTopic = keyof typeof REVIEW_TOPICS;
export type ReviewCriterion = (typeof REVIEW_TOPICS)[ReviewTopic]["criteria"][number][0];
export type ReviewTopicMode = "general" | "criteria";
export type ReviewTopicDetail = {
  mode: ReviewTopicMode;
  generalRating: number | null;
  criteria: Partial<Record<string, number | null>>;
};
export type ReviewRatingDetails = {
  version: typeof REVIEW_CRITERIA_VERSION;
  food: ReviewTopicDetail;
  ambience: ReviewTopicDetail;
  service: ReviewTopicDetail;
};

export function isReviewRating(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5;
}

export function createGeneralRatingDetails(ratings?: Partial<Record<ReviewTopic, number | null>>): ReviewRatingDetails {
  return {
    version: REVIEW_CRITERIA_VERSION,
    food: { mode: "general", generalRating: ratings?.food ?? null, criteria: {} },
    ambience: { mode: "general", generalRating: ratings?.ambience ?? null, criteria: {} },
    service: { mode: "general", generalRating: ratings?.service ?? null, criteria: {} },
  };
}

export function getTopicCriteriaScore(detail: ReviewTopicDetail) {
  const values = Object.values(detail.criteria).filter(isReviewRating);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function getTopicScore(detail: ReviewTopicDetail) {
  return detail.mode === "criteria" ? getTopicCriteriaScore(detail) : detail.generalRating;
}

export function getRatingDetailsScore(details: ReviewRatingDetails) {
  return getDimensionalReviewScore(getTopicScore(details.food), getTopicScore(details.service), getTopicScore(details.ambience));
}

export function getCriteriaCount(detail: ReviewTopicDetail) {
  return Object.values(detail.criteria).filter(isReviewRating).length;
}

export function hasDetailedCriteria(details: ReviewRatingDetails | null | undefined) {
  return Boolean(details && (details.food.mode === "criteria" || details.ambience.mode === "criteria" || details.service.mode === "criteria"));
}
