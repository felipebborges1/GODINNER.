import assert from "node:assert/strict";
import test from "node:test";
import { mapReviewUrl } from "../lib/review/map-review-entry.ts";
import { readFile } from "node:fs/promises";

test("map review entry keeps the restaurant name and uses the dedicated review route", () => {
  assert.equal(mapReviewUrl(" Madero, Bahia "), "/review/map?name=Madero%2C+Bahia");
  assert.equal(mapReviewUrl(), "/review/map");
});

test("map review waits for a pin before creating a pending restaurant", async () => {
  const client = await readFile(new URL("../components/review/map-review-client.tsx", import.meta.url), "utf8");
  assert.match(client, /Marque a localização no mapa para continuar/);
  assert.match(client, /sessionStorage\.setItem\(draftStorageKey/);
  assert.match(client, /submitRestaurant\(/);
});
