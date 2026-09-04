import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const feed = await readFile(new URL("../app/feed/page.tsx", import.meta.url), "utf8");
const deferredMap = await readFile(new URL("../components/search/deferred-map-view.tsx", import.meta.url), "utf8");
const restaurantProfile = await readFile(new URL("../components/restaurant/restaurant-profile.tsx", import.meta.url), "utf8");
const routeError = await readFile(new URL("../app/error.tsx", import.meta.url), "utf8");

test("Feed mounts a bounded first page and exposes progressive loading without a manual button", () => {
  assert.match(feed, /const FEED_PAGE_SIZE = 10/);
  assert.match(feed, /activities\.slice\(0, visibleCount\)/);
  assert.match(feed, /<InfiniteFeedSentinel hasMore=\{hasMore\} onLoadMore=\{loadNextPage\}\/>/);
  assert.doesNotMatch(feed, /Carregar mais/);
});

test("restaurant map stays code-split until its section approaches the viewport", () => {
  assert.match(deferredMap, /dynamic\(\(\) => import\("@\/components\/search\/map-view"\)/);
  assert.match(deferredMap, /new IntersectionObserver/);
  assert.match(deferredMap, /rootMargin: "320px 0px"/);
  assert.match(restaurantProfile, /<DeferredMapView restaurants=\{\[restaurant\]\}/);
  assert.doesNotMatch(restaurantProfile, /<MapView restaurants=\{\[restaurant\]\}/);
});

test("route errors retain a recovery path instead of a white screen", () => {
  assert.match(routeError, /export default function RouteError/);
  assert.match(routeError, /Tentar novamente/);
  assert.match(routeError, /Ir para Discover/);
});
