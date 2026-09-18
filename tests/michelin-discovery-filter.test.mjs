import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path);
  const commonJsModule = { exports: {} };
  cache.set(path, commonJsModule.exports);
  const source = fs.readFileSync(new URL(`../${path}.ts`, import.meta.url), "utf8");
  new Function("exports", "require", "module", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(commonJsModule.exports, (name) => load(name.replace("@/", "")), commonJsModule);
  return commonJsModule.exports;
}

const { hasVerifiedMichelinStars, isOfficialMichelinGuideUrl, michelinLabel } = load("lib/michelin");
const { filterRestaurants } = load("lib/search");

const routePath = new URL("../app/api/admin/restaurants/[id]/michelin/route.ts", import.meta.url);
const migrationPath = new URL("../supabase/migrations/20260918000001_michelin_recognition.sql", import.meta.url);
const validationFixMigrationPath = new URL("../supabase/migrations/20260918000002_fix_michelin_official_url_validation.sql", import.meta.url);
const constraintFixMigrationPath = new URL("../supabase/migrations/20260918000003_fix_michelin_recognition_constraints.sql", import.meta.url);
const sheetPath = new URL("../components/search/filter-sheet.tsx", import.meta.url);
const searchPath = new URL("../components/search/search-explorer.tsx", import.meta.url);
const cardPath = new URL("../components/restaurant/restaurant-card.tsx", import.meta.url);
const profilePath = new URL("../components/restaurant/restaurant-profile.tsx", import.meta.url);
const adminPath = new URL("../components/admin/admin-michelin-recognition.tsx", import.meta.url);

function restaurant(id, city, michelin, extra = {}) {
  return { id, slug: id, name: id, cuisine: ["Brasileira"], tags: [], category: "restaurant", chef: "", occasions: [], isOpenNow: true, distanceKm: 1, priceRange: "$$", neighborhood: "Centro", city, address: "Rua 1", godinnerRating: 4.5, friendsRating: 0, reviewCount: 1, coverPhoto: { id: `${id}-photo`, url: "https://example.com/photo.jpg", alt: id }, photos: [], michelin, ...extra };
}

test("only current 1, 2 and 3 Michelin-star records satisfy the filter", () => {
  for (const stars of [1, 2, 3]) assert.equal(hasVerifiedMichelinStars({ state: "verified_starred", stars, editionYear: 2026, sourceUrl: "https://guide.michelin.com/br/pt/restaurants" }), true);
  assert.equal(hasVerifiedMichelinStars({ state: "unknown" }), false);
  assert.equal(hasVerifiedMichelinStars({ state: "verified_no_star", editionYear: 2026, sourceUrl: "https://guide.michelin.com/br/pt/restaurants" }), false);
  assert.equal(hasVerifiedMichelinStars({ state: "needs_revalidation" }), false);
  assert.equal(michelinLabel({ state: "verified_starred", stars: 1, editionYear: 2026, sourceUrl: "https://guide.michelin.com/br/pt/restaurants" }), "1 estrela Michelin · edição 2026");
});

test("Michelin filtering composes with location and Duo without expanding the catalog", () => {
  const rows = [
    restaurant("one", "São Paulo", { state: "verified_starred", stars: 1, editionYear: 2026, sourceUrl: "https://guide.michelin.com/br/pt/restaurants" }),
    restaurant("two", "São Paulo", { state: "verified_starred", stars: 2, editionYear: 2026, sourceUrl: "https://guide.michelin.com/br/pt/restaurants" }, { acceptsDuoGourmet: true }),
    restaurant("unknown", "São Paulo", { state: "unknown" }, { acceptsDuoGourmet: true }),
    restaurant("other-city", "Rio de Janeiro", { state: "verified_starred", stars: 3, editionYear: 2026, sourceUrl: "https://guide.michelin.com/br/pt/restaurants" }, { acceptsDuoGourmet: true }),
  ];
  assert.deepEqual(filterRestaurants(rows, { michelin: "starred" }, [], null).map((item) => item.id), ["one", "two", "other-city"]);
  assert.deepEqual(filterRestaurants(rows, { michelin: "starred", city: "sao-paulo", duo: "true" }, [], null).map((item) => item.id), ["two"]);
});

test("only official Guide Michelin URLs are accepted for a verification", () => {
  assert.equal(isOfficialMichelinGuideUrl("https://guide.michelin.com/br/pt/restaurants"), true);
  assert.equal(isOfficialMichelinGuideUrl("https://news.example.com/michelin"), false);
  assert.equal(isOfficialMichelinGuideUrl("http://guide.michelin.com/br/pt/restaurants"), false);
});

test("migration keeps unknown distinct, stores audit history, and restricts it to admins", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /michelin_status text not null default 'unknown'/);
  assert.match(migration, /'verified_starred', 'verified_no_star', 'needs_revalidation'/);
  assert.match(migration, /restaurant_michelin_recognition_history/);
  assert.match(migration, /restaurant_michelin_history_admin_read/);
  assert.match(migration, /public\.is_admin\(\)/);
  assert.match(migration, /set_restaurant_michelin_recognition/);
  assert.doesNotMatch(migration, /default 0/);
});

test("Michelin database validation accepts the same official Guide URLs as the admin UI", async () => {
  const migration = await readFile(validationFixMigrationPath, "utf8");
  assert.match(migration, /p_source_url like 'https:\/\/guide\.michelin\.com\/%'/);
  assert.match(migration, /p_source_url like 'https:\/\/%.guide\.michelin\.com\/%'/);
  assert.doesNotMatch(migration, /p_source_url !~/);
  assert.match(migration, /invalid_michelin_verification/);
  assert.match(migration, /restaurant_michelin_recognition_history/);
});

test("Michelin row constraints use the same official URL rule as the RPC", async () => {
  const migration = await readFile(constraintFixMigrationPath, "utf8");
  assert.match(migration, /drop constraint restaurants_michelin_verified_starred_check/);
  assert.match(migration, /drop constraint restaurants_michelin_no_star_check/);
  assert.match(migration, /michelin_source_url like 'https:\/\/guide\.michelin\.com\/%'/);
  assert.match(migration, /michelin_source_url like 'https:\/\/%.guide\.michelin\.com\/%'/);
  assert.doesNotMatch(migration, /michelin_source_url ~|michelin_source_url !~/);
});

test("UI exposes the recognition filter, its removable shared query, and clear labels", async () => {
  const [sheet, search, card, profile, admin, route] = await Promise.all([sheetPath, searchPath, cardPath, profilePath, adminPath, routePath].map((path) => readFile(path, "utf8")));
  assert.match(sheet, /Reconhecimentos/);
  assert.match(sheet, /Com estrela Michelin/);
  assert.match(search, /michelin/);
  assert.match(search, /Não encontramos restaurantes com estrela Michelin verificada para estes filtros\./);
  assert.match(search, /Remover filtro Michelin/);
  assert.match(card, /MichelinRecognitionBadge/);
  assert.match(profile, /MichelinRecognitionSource/);
  assert.match(admin, /URL oficial do Guia Michelin/);
  assert.match(admin, /status: recognition\.state/);
  assert.match(admin, /Ver histórico/);
  assert.match(route, /administrator\?\.role !== "admin"/);
  assert.match(route, /isOfficialMichelinGuideUrl/);
  assert.doesNotMatch(route, /SERVICE_ROLE_KEY/);
});

test("Michelin saving records safe server diagnostics and reconciles only an explicit retry", async () => {
  const [admin, route] = await Promise.all([adminPath, routePath].map((path) => readFile(path, "utf8")));
  assert.match(route, /attemptId/);
  assert.match(route, /phase: "rpc"/);
  assert.match(route, /sanitizeDiagnostic/);
  assert.match(route, /body\?\.retry === true/);
  assert.match(route, /matchesRequestedRecognition/);
  assert.match(route, /Referência: \$\{attemptId\}/);
  assert.match(admin, /const inFlight = useRef\(false\)/);
  assert.match(admin, /retry: Boolean\(priorAttempt\)/);
  assert.match(admin, /O salvamento anterior foi confirmado sem duplicar o histórico\./);
});
