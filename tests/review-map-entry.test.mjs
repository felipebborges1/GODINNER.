import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [mapClient, locationPicker, selector, discover] = await Promise.all([
  readFile(new URL("../components/review/map-review-client.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/restaurant/location-picker.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/review/restaurant-selector.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
]);

test("map review flow persists only on explicit confirmation and resumes after login", () => {
  assert.match(mapClient, /Confirmar local e avaliar/);
  assert.match(mapClient, /sessionStorage\.setItem\(draftStorageKey/);
  assert.match(mapClient, /resume=map/);
  assert.match(mapClient, /submitRestaurant\(/);
});

test("map location stays unconfirmed until a pin is placed and stale geocoding cannot win", () => {
  assert.match(locationPicker, /marker\.current\?\.setVisible\(true\)/);
  assert.match(locationPicker, /resolveVersion/);
  assert.match(locationPicker, /version !== resolveVersion\.current/);
  assert.doesNotMatch(locationPicker, /defaultCenter/);
});

test("not-found and failed external search offer the shared map-review entry", () => {
  assert.match(selector, /MapReviewEntryCta failed/);
  assert.match(selector, /MapReviewEntryCta onStart/);
  assert.match(discover, /MapReviewEntryCta failed/);
  assert.match(discover, /mapReviewUrl/);
});
