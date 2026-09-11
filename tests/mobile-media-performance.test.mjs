import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const cover = await readFile(new URL("../components/restaurant/google-place-cover.tsx", import.meta.url), "utf8");
const reviewMedia = await readFile(new URL("../components/review/review-media.tsx", import.meta.url), "utf8");
const discover = await readFile(new URL("../components/discover/discover-section.tsx", import.meta.url), "utf8");
const recommendations = await readFile(new URL("../components/discover/recommendation-section.tsx", import.meta.url), "utf8");
const activity = await readFile(new URL("../components/social/friend-activity-card.tsx", import.meta.url), "utf8");
const diagnostics = await readFile(new URL("../lib/media-performance-diagnostics.ts", import.meta.url), "utf8");

test("horizontal cards prepare only the next card without making it high priority", () => {
  assert.match(discover, /imageEager=\{index === 1\}/);
  assert.match(recommendations, /imagePriority=\{index === 0\} imageEager=\{index === 1\}/);
  assert.match(cover, /loading=\{priority \? undefined : eager \? "eager" : "lazy"\}/);
  assert.match(cover, /rootMargin: "160px 360px"/);
  assert.match(cover, /priority=\{priority\}/);
});

test("social review media prepares the adjacent card and keeps private-media handling", () => {
  assert.match(activity, /mediaPriority = false,[\s\S]*mediaEager = false/);
  assert.match(activity, /priority=\{mediaPriority\} eager=\{mediaEager\}/);
  assert.match(reviewMedia, /const shouldEagerLoad = isFirstPriorityMedia \|\| \(eager && index === 0\) \|\| index === activeIndex \+ 1/);
  assert.match(reviewMedia, /unoptimized=\{photo\.url\.startsWith\("\/api\/review-photo\/"\)\}/);
  assert.match(reviewMedia, /await image\.decode\(\)/);
});

test("preview diagnostics avoid sensitive media values", () => {
  assert.match(diagnostics, /window\.location\.hostname\.endsWith\("\.vercel\.app"\)/);
  assert.match(diagnostics, /mediaDebug/);
  assert.match(diagnostics, /events\.slice\(-79\)/);
  assert.match(diagnostics, /const event = \{ source, key, stage, elapsedMs/);
  assert.doesNotMatch(diagnostics, /signedUrl/);
});
