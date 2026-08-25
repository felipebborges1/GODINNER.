import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260825000004_single_scale_review_ratings.sql", import.meta.url), "utf8");
const precisionFix = await readFile(new URL("../supabase/migrations/20260825000005_restore_precise_historical_ratings.sql", import.meta.url), "utf8");
const ratingUtility = await readFile(new URL("../lib/review-rating.ts", import.meta.url), "utf8");
const mapper = await readFile(new URL("../lib/supabase/mappers.ts", import.meta.url), "utf8");
const reviewForm = await readFile(new URL("../components/review/review-form.tsx", import.meta.url), "utf8");
const search = await readFile(new URL("../lib/search.ts", import.meta.url), "utf8");

const display = (score) => (Math.round((score + Number.EPSILON) * 10) / 10).toFixed(1).replace(".", ",");
const convertedLegacyScore = (rating) => rating / 2;
const dimensionalScore = (food, service, ambience) => (food + service + ambience) / 3;

test("single-scale migration converts historical scores exactly once and keeps dimensions nullable", () => {
  for (const [oldRating, expected] of [[7.9, 3.95], [8, 4], [8.5, 4.25], [9, 4.5], [9.1, 4.55]]) {
    assert.equal(convertedLegacyScore(oldRating), expected);
  }
  assert.match(migration, /set rating = rating \/ 2/);
  assert.match(migration, /rating_method = 'legacy' and rating > 5/);
  assert.match(migration, /alter column rating type numeric\(5,3\)/);
  assert.match(migration, /rating between 0 and 5/);
  assert.match(migration, /rating_method = 'legacy' and food_rating is null/);
  assert.match(precisionFix, /4\.150/);
  assert.match(precisionFix, /4\.550/);
  assert.match(precisionFix, /3\.950/);
});

test("new dimensional reviews calculate one persisted 1-5 score server-side", () => {
  assert.equal(dimensionalScore(5, 5, 5), 5);
  assert.equal(dimensionalScore(1, 1, 1), 1);
  assert.equal(dimensionalScore(5, 4, 3), 4);
  assert.equal(dimensionalScore(5, 4, 5), 14 / 3);
  assert.match(migration, /\(p_food_rating \+ p_service_rating \+ p_ambience_rating\)::numeric \/ 3/);
  assert.match(migration, /p_food_rating not between 1 and 5/);
  assert.match(reviewForm, /Avalie comida, serviço e ambiente de 1 a 5 estrelas/);
});

test("runtime reads the persisted 1-5 value directly and only normalizes old URL filters", () => {
  const scoreFunction = ratingUtility.slice(ratingUtility.indexOf("export function getReviewScore"), ratingUtility.indexOf("export function averageReviewScore"));
  assert.doesNotMatch(scoreFunction, /\/ 2|\* 2/);
  assert.doesNotMatch(mapper, /legacyRating|\/ 2/);
  assert.match(search, /normalizeRatingFilter/);
  assert.equal(convertedLegacyScore(7), 3.5);
  assert.equal(convertedLegacyScore(8), 4);
  assert.equal(convertedLegacyScore(9), 4.5);
  assert.equal(display(4.55), "4,6");
});
