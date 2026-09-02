import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import TypeScript from "typescript";

const source = await readFile(new URL("../lib/recommendations/engine.ts", import.meta.url), "utf8");
const compiled = TypeScript.transpileModule(source, { compilerOptions: { module: TypeScript.ModuleKind.CommonJS, target: TypeScript.ScriptTarget.ES2022 } });
const compiledModule = { exports: {} };
new Function("exports", "require", "module", compiled.outputText)(compiledModule.exports, () => ({}), compiledModule);
const { generateRecommendations, RECOMMENDATION_RANKING_CONFIG } = compiledModule.exports;

const restaurant = (id, cuisine, status = "published", coordinates) => ({ id, slug: id, name: id, cuisine: [cuisine], status, coordinates });
const review = (id, userId, restaurantId, rating, extra = {}) => ({ id, userId, restaurantId, rating, ...extra });
const input = (overrides = {}) => ({ currentUserId: "me", restaurants: [], reviews: [], follows: [], likes: [], lists: [], ...overrides });
const ownReviews = (count, cuisine = "Japonesa", rating = 5) => Array.from({ length: count }, (_, index) => review(`own-${index}`, "me", `visited-${index}`, rating));
const visitedRestaurants = (count, cuisine = "Japonesa") => Array.from({ length: count }, (_, index) => restaurant(`visited-${index}`, cuisine));

test("identifies locked, early, and personalized maturity without creating recommendations too early", () => {
  for (const count of [0, 1, 2]) {
    const result = generateRecommendations(input({ restaurants: [...visitedRestaurants(count), restaurant("candidate", "Italiana")], reviews: ownReviews(count) }));
    assert.equal(result.maturity, "locked");
    assert.equal(result.recommendations.length, 0);
  }
  const early = generateRecommendations(input({ restaurants: [...visitedRestaurants(3), restaurant("candidate", "Italiana")], reviews: ownReviews(3) }));
  assert.equal(early.maturity, "early");
  assert.equal(early.recommendations.length, 1);
  const personalized = generateRecommendations(input({ restaurants: [...visitedRestaurants(8), restaurant("candidate", "Italiana")], reviews: ownReviews(8) }));
  assert.equal(personalized.maturity, "personalized");
});

test("filters already reviewed, pending, duplicate, and incomplete catalog candidates", () => {
  const result = generateRecommendations(input({
    restaurants: [...visitedRestaurants(3), restaurant("visited-0", "Japonesa"), restaurant("pending", "Italiana", "pending_review"), restaurant("duplicate", "Italiana"), restaurant("duplicate", "Italiana"), { ...restaurant("missing-cuisine", "Italiana"), cuisine: [] }],
    reviews: ownReviews(3),
  }));
  assert.deepEqual(result.recommendations.map((item) => item.restaurant.id), ["duplicate"]);
});

test("uses taste, protects against negative preference, and keeps likes weaker than own reviews", () => {
  const restaurants = [...visitedRestaurants(3, "Japonesa"), ...visitedRestaurants(3, "Italiana").map((item, index) => ({ ...item, id: `italian-visited-${index}`, slug: `italian-visited-${index}` })), restaurant("japanese", "Japonesa"), restaurant("italian", "Italiana")];
  const reviews = [...ownReviews(3, "Japonesa", 5), ...Array.from({ length: 3 }, (_, index) => review(`negative-${index}`, "me", `italian-visited-${index}`, 1)), review("liked", "other", "italian", 5)];
  const result = generateRecommendations(input({ restaurants, reviews, likes: [{ userId: "me", reviewId: "liked" }] }));
  const japanese = result.recommendations.find((item) => item.restaurant.id === "japanese");
  const italian = result.recommendations.find((item) => item.restaurant.id === "italian");
  assert.ok(japanese.signals.taste > italian.signals.taste);
  assert.equal(italian.signals.taste, 0);
  assert.equal(italian.signals.likedReview, 100);
  assert.ok(RECOMMENDATION_RANKING_CONFIG.personalized.likedReview < RECOMMENDATION_RANKING_CONFIG.personalized.taste);
});

test("uses want-to-visit and followed users as real signals with an explainable reason", () => {
  const restaurants = [...visitedRestaurants(3), restaurant("wanted", "Italiana"), restaurant("social", "Mineira")];
  const reviews = [...ownReviews(3), review("friend-review", "friend", "social", 5)];
  const result = generateRecommendations(input({
    restaurants,
    reviews,
    follows: [{ followerId: "me", followingId: "friend", createdAt: "2026-01-01" }],
    lists: [{ id: "want", ownerId: "me", type: "want", restaurantIds: ["wanted"] }],
  }));
  const wanted = result.recommendations.find((item) => item.restaurant.id === "wanted");
  const social = result.recommendations.find((item) => item.restaurant.id === "social");
  assert.equal(wanted.reasonType, "want_to_visit");
  assert.ok(wanted.signals.intent > 0);
  assert.ok(social.signals.social > 0);
  assert.equal(social.reasonType, "social");
});

test("never compares spending across currencies and does not require location", () => {
  const restaurants = [...visitedRestaurants(3), restaurant("euro", "Italiana"), restaurant("nearby", "Mineira", "published", { latitude: -19.97, longitude: -43.94 })];
  const reviews = [...ownReviews(3), review("brl-spend", "me", "visited-0", 5, { amountPerPerson: 100, currency: "BRL" }), review("eur-spend", "other", "euro", 80, { amountPerPerson: 80, currency: "EUR" })];
  const withoutLocation = generateRecommendations(input({ restaurants, reviews }));
  const euro = withoutLocation.recommendations.find((item) => item.restaurant.id === "euro");
  assert.equal(euro.signals.priceCompatibility, 0);
  assert.equal(euro.signals.proximity, 0);
  const withLocation = generateRecommendations(input({ restaurants, reviews, location: { latitude: -19.97, longitude: -43.94 } }));
  assert.ok(withLocation.recommendations.find((item) => item.restaurant.id === "nearby").signals.proximity > 0);
});

test("uses confidence for sparse quality and diversifies an otherwise homogeneous list", () => {
  const restaurants = [...visitedRestaurants(3), restaurant("j1", "Japonesa"), restaurant("j2", "Japonesa"), restaurant("j3", "Japonesa"), restaurant("italian", "Italiana")];
  const reviews = [...ownReviews(3), review("j1-quality", "other", "j1", 5), review("j2-quality", "other", "j2", 5), review("j3-quality", "other", "j3", 5), review("it-quality", "other", "italian", 4)];
  const result = generateRecommendations(input({ restaurants, reviews, limit: 4 }));
  const firstThree = result.recommendations.slice(0, 3).map((item) => item.restaurant.id);
  assert.ok(firstThree.includes("italian"));
  assert.ok(result.recommendations.find((item) => item.restaurant.id === "italian").score < 100);
});
