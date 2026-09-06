import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cover = await readFile(new URL("../components/restaurant/google-place-cover.tsx", import.meta.url), "utf8");
const restaurantCard = await readFile(new URL("../components/restaurant/restaurant-card.tsx", import.meta.url), "utf8");
const restaurantProfile = await readFile(new URL("../components/restaurant/restaurant-profile.tsx", import.meta.url), "utf8");
const route = await readFile(new URL("../app/api/google-places/[slug]/route.ts", import.meta.url), "utf8");

test("Google cover keeps an explicit loading, success and error state", () => {
  assert.match(cover, /phase: "loading" \| "success" \| "error"/);
  assert.match(cover, /const loading = profileState\.phase === "loading"/);
  assert.match(cover, /const failed = profileState\.phase === "error"/);
  assert.match(cover, /onLoad=\{\(\) => setState\(\{ key: requestKey, metadata, phase: "success" \}\)\}/);
  assert.match(cover, /onError=\{\(\) => setState\(\{ key: requestKey, metadata: null, phase: "error" \}\)\}/);
});

test("Google cover keeps loading separate from a neutral unavailable state", () => {
  assert.match(cover, /\{loading && <span className="absolute inset-0 animate-pulse/);
  assert.match(cover, /if \(failed\) return <RestaurantPhotoUnavailable alt=\{alt\} variant="profile"\/>/);
  assert.match(cover, /\{cardFailed && <RestaurantPhotoUnavailable alt=\{alt\} variant="card"\/>\}/);
  assert.doesNotMatch(cover, /fallbackUrl/);
  assert.match(cover, /\{!cardLoaded && !cardFailed && <span className="absolute inset-0 animate-pulse/);
});

test("restaurants without Google media use an explicit neutral unavailable state", () => {
  assert.match(restaurantCard, /restaurant\.hasGooglePlaceCover \? <GooglePlaceCover[\s\S]*? : restaurant\.coverPhoto\.url \? <Image src=\{restaurant\.coverPhoto\.url\}[\s\S]*? : <RestaurantPhotoUnavailable/);
  assert.match(restaurantProfile, /restaurant\.hasGooglePlaceCover \? <GooglePlaceCover[\s\S]*? : galleryPhotos\.length \? <PhotoGallery[\s\S]*? : <RestaurantPhotoUnavailable/);
});

test("Google attribution is rendered only after the real image succeeds", () => {
  assert.match(cover, /\{cardLoaded && <span translate="no"/);
  assert.match(cover, /\{realPhoto && metadata && <div className="absolute bottom-3/);
  assert.match(cover, /duration-150 motion-reduce:transition-none/);
});

test("Google media redirects stay non-cacheable because their destination is temporary", () => {
  assert.match(route, /Cache-Control", "private, no-store, max-age=0"/);
});
