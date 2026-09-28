import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function compile(file, dependencies = {}) {
  const js = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", js)(id => Object.hasOwn(dependencies, id) ? dependencies[id] : require(id), mod, mod.exports);
  return mod.exports;
}
const seo = compile("../lib/seo.ts");
const restaurantSeo = compile("../lib/restaurant-seo.ts", { "@/lib/seo": seo });
const brandDependencies = {
  "@/lib/seo": seo,
  "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
  "@/components/discover/discover-page": { default: () => React.createElement("main", null, "Discover") },
};

test("homepage associates Go Dinner with GODINNER in visible content, metadata and one WebSite entity", () => {
  const home = compile("../app/page.tsx", brandDependencies);
  const html = renderToStaticMarkup(React.createElement(home.default));
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  assert.equal(schemas.length, 1);
  assert.equal(schemas[0].name, "GODINNER");
  assert.equal(schemas[0].alternateName, "Go Dinner");
  assert.equal(schemas[0].url, seo.SITE_URL);
  assert.match(html, /<p[^>]*>GODINNER, ou Go Dinner, é sua comunidade/);
  assert.match(home.metadata.title, /GODINNER \(Go Dinner\)/);
  assert.match(home.metadata.description, /Go Dinner/);
  assert.equal(home.metadata.openGraph.siteName, "GODINNER");
  assert.equal(home.metadata.twitter.title, home.metadata.title);
  assert.equal(home.metadata.openGraph.title, home.metadata.title);
  assert.equal(home.metadata.alternates.canonical, seo.SITE_URL);
  assert.equal(home.metadata.robots, undefined, "preserve inherited Preview noindex");
});

test("about page explains the alternate spelling without replacing the brand or canonical", () => {
  const about = compile("../app/sobre/page.tsx", brandDependencies);
  const html = renderToStaticMarkup(React.createElement(about.default));
  assert.match(html, /GODINNER, também escrito como Go Dinner/);
  assert.match(about.metadata.title, /GODINNER \(Go Dinner\)/);
  assert.equal(about.metadata.alternates.canonical, `${seo.SITE_URL}/sobre`);
  assert.equal(about.metadata.robots, undefined);
});
const row = { id: "public", slug: "restaurante-publico", name: "Restaurante Público", address: "Rua pública, 10", city: "Lisboa", neighborhood: "Centro", country_code: "PT", category: "restaurant", cuisines: [], price_range: null, status: "published", merged_into_id: null };
function client(replies) {
  const calls = [];
  return { calls, from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const chain = {
      select(fields) { call.fields = fields; return chain; },
      eq(key, value) { call.filters.push([key, value]); return chain; },
      is(key, value) { call.filters.push([key, value]); return chain; },
      order(key) { call.order = key; return chain; },
      range(start, end) { call.range = [start, end]; return Promise.resolve(replies.shift()); },
      maybeSingle() { return Promise.resolve(replies.shift()); },
    }; return chain;
  } };
}
function dataLayer(anonymous, viewer = { auth: { getUser: async () => ({ data: { user: null }, error: null }) } }) {
  return compile("../lib/data/public-restaurant-seo.ts", {
    "server-only": {}, react: { cache: fn => fn },
    "@supabase/supabase-js": { createClient: (url, key, options) => { assert.equal(key, "public-anon"); assert.equal(options.auth.persistSession, false); return anonymous; } },
    "@/lib/supabase/env": { getSupabasePublicEnv: () => ({ url: "https://example.invalid", anonKey: "public-anon" }) },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => viewer },
    "@/lib/restaurant-seo": restaurantSeo,
  });
}

test("restaurant metadata is unique, canonical on official domain, and previews remain noindex", () => {
  const metadata = restaurantSeo.restaurantMetadata(row, false);
  assert.match(metadata.title, /Restaurante Público em Lisboa/);
  assert.equal(metadata.alternates.canonical, `${seo.SITE_URL}/restaurant/restaurante-publico`);
  assert.match(metadata.description, /Centro, Lisboa/);
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
  assert.equal(metadata.twitter.title, metadata.title);
  assert.equal(metadata.robots.index, true);
  assert.equal(restaurantSeo.restaurantMetadata(row, true).robots.index, false);
});

test("structured data includes only real public facts; no invented country, hours, rating or identity", () => {
  const schema = restaurantSeo.restaurantStructuredData({ ...row, submitted_by: "private", phone: "private", country_code: null });
  assert.equal(schema["@type"], "Restaurant");
  assert.equal(schema.address.addressCountry, undefined);
  for (const key of ["aggregateRating", "review", "openingHours", "geo", "telephone", "submitted_by"]) assert.equal(schema[key], undefined);
  assert.equal(restaurantSeo.restaurantStructuredData({ ...row, category: "bar" })["@type"], "BarOrPub");
  assert.ok(!seo.jsonLd({ name: "</script><script>bad</script>" }).includes("<"));
});

test("visible server summary has restaurant name and address without pretending zero reviews", () => {
  const { PublicRestaurantSummary } = compile("../components/restaurant/public-restaurant-summary.tsx");
  const html = renderToStaticMarkup(React.createElement(PublicRestaurantSummary, { restaurant: row }));
  assert.match(html, /<h1[^>]*>Restaurante Público<\/h1>/);
  assert.match(html, /Rua pública, 10/);
  assert.ok(!html.includes("0 avaliações"));
  assert.ok(!html.includes("sr-only"));
});

test("public read filters publication and merge, selects explicit fields without private authorship", async () => {
  const db = client([{ data: row, error: null }]);
  assert.deepEqual(await dataLayer(db).readPublicRestaurant(db, row.slug), row);
  assert.deepEqual(db.calls[0].filters, [["slug", row.slug], ["status", "published"], ["merged_into_id", null]]);
  assert.ok(!/\*|submitted|moderated|rejection|phone|verified_by/.test(db.calls[0].fields));
});

test("pending, rejected, merged and malformed slugs never become public SEO", async () => {
  for (const override of [{ status: "pending_review" }, { status: "rejected" }, { merged_into_id: "other" }, { slug: "../private" }]) {
    const db = client([{ data: { ...row, ...override }, error: null }]);
    assert.equal(await dataLayer(db).readPublicRestaurant(db, row.slug), null);
  }
});

test("public restaurant never needs privileged or viewer queries", async () => {
  const db = client([{ data: row, error: null }]);
  assert.equal((await dataLayer(db, null).resolveRestaurantPage(row.slug)).kind, "public");
});

test("anonymous absence is missing, while an authorized pending workflow stays private without SEO data", async () => {
  assert.equal((await dataLayer(client([{ data: null, error: null }])).resolveRestaurantPage("missing")).kind, "missing");
  const viewer = client([{ data: { id: "owned" }, error: null }]);
  viewer.auth = { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) };
  assert.deepEqual(await dataLayer(client([{ data: null, error: null }]), viewer).resolveRestaurantPage("owned"), { kind: "private" });
  assert.equal(viewer.calls[0].fields, "id");
});

test("another user's protected record remains missing under viewer RLS", async () => {
  const viewer = client([{ data: null, error: null }]);
  viewer.auth = { getUser: async () => ({ data: { user: { id: "other" } }, error: null }) };
  assert.equal((await dataLayer(client([{ data: null, error: null }]), viewer).resolveRestaurantPage("protected")).kind, "missing");
});

test("database failure is not misclassified as not found", async () => {
  const db = client([{ data: null, error: new Error("offline") }]);
  await assert.rejects(dataLayer(db).resolveRestaurantPage("published"), /catálogo público/);
});

test("sitemap pages beyond 500 without private/merged records or duplicates", async () => {
  const first = Array.from({ length: 500 }, (_, i) => ({ ...row, slug: `place-${i}` }));
  const db = client([{ data: first, error: null }, { data: [first[0], { ...row, slug: "last" }, { ...row, status: "pending_review" }], error: null }]);
  const result = await dataLayer(db).readPublicSitemapRestaurants(db);
  assert.equal(result.length, 501);
  assert.equal(result.at(-1).slug, "last");
  assert.deepEqual(db.calls.map(c => c.range), [[0, 499], [500, 999]]);
  assert.ok(db.calls.every(c => c.order === "slug" && c.filters.some(([k, v]) => k === "status" && v === "published")));
});

test("sitemap fails rather than silently publishing an incomplete catalog", async () => {
  const db = client([{ data: null, error: new Error("offline") }]);
  await assert.rejects(dataLayer(db).readPublicSitemapRestaurants(db), /sitemap completo/);
});

test("preview sitemap never reads catalog; public sitemap uses only official canonical URLs", async () => {
  let reads = 0;
  const dependencies = { "@/lib/seo": { ...seo, isPreview: true }, "@/lib/data/public-restaurant-seo": { publicSitemapRestaurants: async () => { reads++; return [row]; } }, "@/lib/restaurant-seo": restaurantSeo };
  assert.deepEqual(await compile("../app/sitemap.ts", dependencies).default(), []);
  assert.equal(reads, 0);
  dependencies["@/lib/seo"].isPreview = false;
  const entries = await compile("../app/sitemap.ts", dependencies).default();
  assert.equal(entries.length, 5);
  assert.ok(entries.every(e => e.url.startsWith(seo.SITE_URL)));
});
