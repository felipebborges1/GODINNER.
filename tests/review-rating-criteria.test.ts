import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createGeneralRatingDetails, getCriteriaCount, getRatingDetailsScore, getTopicScore } from "../lib/review-criteria.ts";

const migration = await readFile(new URL("../supabase/migrations/20260918000000_review_rating_criteria.sql", import.meta.url), "utf8");
const form = await readFile(new URL("../components/review/review-form.tsx", import.meta.url), "utf8");

test("keeps the three general topic ratings and their established final average", () => {
  const details = createGeneralRatingDetails({ food: 5, ambience: 4, service: 3 });
  assert.equal(getTopicScore(details.food), 5);
  assert.equal(getRatingDetailsScore(details), 4);
});

test("uses only answered criteria with equal weight and never turns absence into zero", () => {
  const details = createGeneralRatingDetails({ food: 4, ambience: 4, service: 4 });
  details.food = { mode: "criteria", generalRating: 4, criteria: { taste: 5, texture: 4, temperature: null, presentation: 4 } };
  assert.equal(getCriteriaCount(details.food), 3);
  assert.equal(getTopicScore(details.food), 13 / 3);
});

test("does not produce a topic score when detailed criteria are empty", () => {
  const details = createGeneralRatingDetails({ food: 4, ambience: 4, service: 4 });
  details.food = { mode: "criteria", generalRating: 4, criteria: { taste: null } };
  assert.equal(getCriteriaCount(details.food), 0);
  assert.equal(getTopicScore(details.food), null);
});

test("persists details with server-side validation and preserves old review rows", () => {
  assert.match(migration, /add column if not exists rating_details jsonb/);
  assert.match(migration, /alter column food_rating type numeric\(5,3\)/);
  assert.match(migration, /unknown_rating_criterion/);
  assert.match(migration, /invalid_rating_criterion_value/);
  assert.match(migration, /rating_criteria_required/);
  assert.match(migration, /publish_review_with_rating_details/);
  assert.match(migration, /update_review_with_rating_details_owned/);
  assert.doesNotMatch(migration, /update public\.reviews\s+set rating_details/);
  assert.match(form, /DetailedRatingInput/);
  assert.match(form, /getCriteriaCount/);
});
