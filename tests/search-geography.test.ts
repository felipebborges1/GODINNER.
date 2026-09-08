import assert from "node:assert/strict";
import test from "node:test";
import { resolveSearchGeography } from "../lib/search-geography.ts";

const restaurants = [
  { id: "bh", city: "Belo Horizonte", countryCode: "BR" },
  { id: "cuiaba", city: "Cuiabá", countryCode: "BR", address: "Av. Miguel Sutil - MT, 78043-228" },
  { id: "madrid", city: "Madrid", countryCode: "ES" },
];

test("an explicit city scopes the catalog and removes the city from the place term", () => {
  const scope = resolveSearchGeography(restaurants, "Madero, Cuiabá", { city: "Belo Horizonte", countryCode: "BR" });
  assert.deepEqual(scope.explicitCity, { city: "Cuiabá", countryCode: "BR", region: "MT" });
  assert.equal(scope.query, "Madero");
  assert.deepEqual(scope.scopedRestaurants.map((restaurant) => restaurant.id), ["cuiaba"]);
  assert.deepEqual(scope.otherRegionRestaurants, []);
});

test("a city-less query keeps the selected region first and exposes other catalog regions only as a fallback", () => {
  const scope = resolveSearchGeography(restaurants, "Madero", { city: "Belo Horizonte", countryCode: "BR" });
  assert.equal(scope.explicitCity, null);
  assert.deepEqual(scope.scopedRestaurants.map((restaurant) => restaurant.id), ["bh"]);
  assert.deepEqual(scope.otherRegionRestaurants.map((restaurant) => restaurant.id), ["cuiaba", "madrid"]);
});

test("a repeated city name in more than one country is never selected arbitrarily", () => {
  const scope = resolveSearchGeography([
    { id: "us", city: "Springfield", countryCode: "US" },
    { id: "ca", city: "Springfield", countryCode: "CA" },
  ], "Bistro, Springfield");
  assert.equal(scope.explicitCity, null);
  assert.equal(scope.ambiguousCities.length, 2);
  assert.equal(scope.query, "Bistro, Springfield");
});
