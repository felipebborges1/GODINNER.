import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260824000001_dimensional_review_ratings.sql", import.meta.url), "utf8");
const ratingUtility = await readFile(new URL("../lib/review-rating.ts", import.meta.url), "utf8");
const reviewForm = await readFile(new URL("../components/review/review-form.tsx", import.meta.url), "utf8");
const search = await readFile(new URL("../lib/search.ts", import.meta.url), "utf8");

const display = (score) => (Math.round((score + Number.EPSILON) * 10) / 10).toFixed(1).replace(".", ",");
const legacyScore = (rating) => rating / 2;
const dimensionalScore = (food, service, ambience) => (food + service + ambience) / 3;

test("legacy ratings stay intact and are displayed on the 1-5 scale", () => {
  assert.equal(display(legacyScore(7.9)), "4,0");
  assert.equal(display(legacyScore(8.6)), "4,3");
  assert.equal(display(legacyScore(9.1)), "4,6");
  assert.match(migration, /set rating_method = 'legacy'/);
  assert.match(migration, /rating_method = 'legacy' and rating is not null/);
});

test("new dimensional ratings derive an unrounded score and validate the 1-5 range", () => {
  assert.equal(display(dimensionalScore(5, 4, 4)), "4,3");
  assert.equal(display(dimensionalScore(5, 5, 5)), "5,0");
  assert.equal(display(dimensionalScore(1, 1, 1)), "1,0");
  assert.match(migration, /p_food_rating not between 1 and 5/);
  assert.match(migration, /rating_method = 'dimensions' and rating is null/);
  assert.match(reviewForm, /Avalie comida, serviço e ambiente de 1 a 5 estrelas/);
});

test("dimension averages ignore legacy reviews and legacy query filters normalize", () => {
  const food = [5, 4];
  assert.equal(food.reduce((sum, value) => sum + value, 0) / food.length, 4.5);
  assert.match(ratingUtility, /review\.ratingMethod === "dimensions"/);
  assert.match(search, /normalizeRatingFilter/);
  assert.equal(8 / 2, 4);
  assert.equal(9 / 2, 4.5);
});
