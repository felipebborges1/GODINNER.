import assert from "node:assert/strict";
import test from "node:test";
import { GooglePlacesRequestError, googlePlacesFailureFromUnknown, googlePlacesFailureMessage, networkFailureCode, retryAfterSeconds } from "../lib/google-places-errors.ts";

test("Google Places failures keep safe categories and never need the upstream response body", () => {
  const quota = new GooglePlacesRequestError("quota", 429, 18);
  assert.equal(googlePlacesFailureFromUnknown(quota), quota);
  assert.match(googlePlacesFailureMessage(quota.code, quota.retryAfterSeconds), /18 segundos/);
  assert.equal(googlePlacesFailureFromUnknown(new Error("secret upstream body")).code, "service");
});

test("Retry-After accepts a bounded delay and ignores invalid headers", () => {
  assert.equal(retryAfterSeconds("4.1"), 5);
  assert.equal(retryAfterSeconds("not-a-date"), undefined);
  assert.equal(retryAfterSeconds("9999"), 300);
});

test("network diagnostics retain only a compact transport code", () => {
  assert.equal(networkFailureCode(Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } })), "ECONNRESET");
  assert.equal(networkFailureCode(Object.assign(new TypeError("fetch failed"), { cause: { code: "sensitive host" } })), undefined);
});
