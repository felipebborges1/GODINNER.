import assert from "node:assert/strict";
import test from "node:test";
import { initialMapArea, mapReviewUrl, suggestedPlaceName } from "../lib/review/map-review-entry.ts";

test("explicit region takes priority over device position and is not part of the name", () => {
  const entry = { query: "Madero, Bahia", manualRegion: { city: "Belo Horizonte", region: "Minas Gerais", country: "Brasil" }, devicePosition: { latitude: -19.9, longitude: -43.9 } };
  assert.equal(suggestedPlaceName(entry.query), "Madero");
  assert.equal(initialMapArea(entry), "Bahia");
  assert.match(mapReviewUrl(entry), /name=Madero/);
  assert.match(mapReviewUrl(entry), /area=Bahia/);
  assert.doesNotMatch(mapReviewUrl(entry), /centerLat/);
});

test("manual region is used when the search contains no geography", () => {
  assert.equal(initialMapArea({ query: "Madero", manualRegion: { city: "Salvador", region: "Bahia", country: "Brasil" } }), "Bahia, Brasil");
});
