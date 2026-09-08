import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getGodinnerRatingSummary } from "../lib/godinner-rating-summary.ts";

const appContext = await readFile(new URL("../context/app-context.tsx", import.meta.url), "utf8");
const card = await readFile(new URL("../components/restaurant/restaurant-card.tsx", import.meta.url), "utf8");
const profile = await readFile(new URL("../components/restaurant/restaurant-profile.tsx", import.meta.url), "utf8");

test("labels zero, singular, plural, and large eligible GODINNER review counts", () => {
  assert.deepEqual(getGodinnerRatingSummary(0), { state: "empty", reviewCount: 0, reviewCountLabel: "Sem avaliações" });
  assert.deepEqual(getGodinnerRatingSummary(1), { state: "rated", reviewCount: 1, reviewCountLabel: "1 avaliação" });
  assert.deepEqual(getGodinnerRatingSummary(23), { state: "rated", reviewCount: 23, reviewCountLabel: "23 avaliações" });
  assert.deepEqual(getGodinnerRatingSummary(12345), { state: "rated", reviewCount: 12345, reviewCountLabel: "12345 avaliações" });
});

test("never represents an unknown aggregate as zero reviews", () => {
  assert.deepEqual(getGodinnerRatingSummary(undefined, { isLoading: true }), { state: "loading", reviewCount: null, reviewCountLabel: "Carregando avaliações" });
  assert.deepEqual(getGodinnerRatingSummary(undefined, { isUnavailable: true }), { state: "unavailable", reviewCount: null, reviewCountLabel: "Avaliações indisponíveis" });
  assert.deepEqual(getGodinnerRatingSummary(-1), { state: "unavailable", reviewCount: null, reviewCountLabel: "Avaliações indisponíveis" });
});

test("cards and the restaurant profile reuse the GODINNER aggregate instead of page-sized review lists", () => {
  assert.match(appContext, /godinnerRating: rating \?\? 0/);
  assert.match(appContext, /reviewCount: restaurantReviews\.filter\(\(review\) => getReviewScore\(review\) !== null\)\.length/);
  assert.match(card, /<GodinnerRatingSummary rating=\{restaurant\.godinnerRating\} reviewCount=\{restaurant\.reviewCount\}/);
  assert.match(profile, /<GodinnerRatingSummary variant="summary" rating=\{restaurant\.godinnerRating\} reviewCount=\{restaurant\.reviewCount\}/);
  assert.doesNotMatch(profile, /\$\{restaurantReviews\.length\} avaliações/);
});
