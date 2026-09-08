import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { googleQueryForReview, hasConfidentInternalPlaceMatch, queryIncludesExplicitPlaceContext, restaurantLocationLabel } from "../lib/review/place-search.ts";
import type { Restaurant } from "../types/index.ts";

const restaurant = (overrides: Partial<Restaurant> = {}) => ({
  id: "catalog-1",
  slug: "casa-do-porto-savassi",
  name: "Casa do Porto",
  address: "Rua Pernambuco, 100",
  neighborhood: "Savassi",
  city: "Belo Horizonte",
  countryCode: "BR",
  ...overrides,
}) as Restaurant;

test("a broad internal result does not suppress Google unless it actually represents the searched place", () => {
  assert.equal(hasConfidentInternalPlaceMatch("Casa do Porto", [restaurant()]), true);
  assert.equal(hasConfidentInternalPlaceMatch("Casa do Porto Cuiabá", [restaurant()]), true);
  assert.equal(hasConfidentInternalPlaceMatch("Restaurante da Praça", [restaurant({ name: "Praça Sete Bar" })]), false);
});

test("an explicit city wins over the current selected region while a city-less query can use it as context", () => {
  const region = { city: "Belo Horizonte", region: "MG", country: "Brasil" };
  assert.equal(queryIncludesExplicitPlaceContext("Madero, Cuiabá"), true);
  assert.equal(googleQueryForReview("Madero, Cuiabá", region), "Madero, Cuiabá");
  assert.equal(googleQueryForReview("Madero", region), "Madero, Belo Horizonte, MG");
  assert.equal(googleQueryForReview("Madero", undefined), "Madero");
});

test("a selected state remains an explicit manual scope without borrowing device coordinates", () => {
  const region = { city: "Bahia", region: "Bahia", country: "Brasil", scopeType: "state" as const };
  assert.equal(googleQueryForReview("Madero", region), "Madero, Bahia, Brasil");
  assert.equal(queryIncludesExplicitPlaceContext(googleQueryForReview("Madero", region)), true);
});

test("an explicit state in the text keeps the selected country context", () => {
  const region = { city: "Bahia", region: "Bahia", country: "Brasil", scopeType: "state" as const };
  assert.equal(googleQueryForReview("Madero, Bahia", region), "Madero, Bahia, Brasil");
});

test("the displayed identity keeps units distinguishable by address and city", () => {
  assert.equal(restaurantLocationLabel(restaurant()), "Rua Pernambuco, 100 · Belo Horizonte");
  assert.equal(restaurantLocationLabel(restaurant({ address: "Av. Paulista, 1", city: "São Paulo", countryCode: "BR" })), "Av. Paulista, 1 · São Paulo");
  assert.equal(restaurantLocationLabel(restaurant({ address: "Calle Gran Vía, 1", city: "Madrid", countryCode: "ES" })), "Calle Gran Vía, 1 · Madrid · ES");
});

test("the unified review journey debounces external search, keeps catalog results usable on failure, and resumes selected places after login", async () => {
  const [selector, reviewClient, reviewForm, googleHook] = await Promise.all([
    readFile(new URL("../components/review/restaurant-selector.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/review/new-review-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/review/review-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../hooks/use-google-place-search.ts", import.meta.url), "utf8"),
  ]);
  assert.match(selector, /window\.setTimeout\([\s\S]*450/);
  assert.match(selector, /Seus resultados do GODINNER continuam disponíveis/);
  assert.match(selector, /!internalPlaceIds\.has\(place\.placeId\)/);
  assert.match(googleHook, /requestVersion/);
  assert.match(reviewClient, /sessionStorage\.setItem\(selectedGooglePlaceStorageKey/);
  assert.match(reviewClient, /resume=\$\{resumeAfterLogin\}/);
  assert.match(reviewForm, /saveLoginDraft\(\)/);
  assert.match(reviewForm, /sessionStorage\.removeItem\(loginDraftKey/);
});
