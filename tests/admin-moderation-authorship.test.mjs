import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const routePath = new URL("../app/api/admin/restaurants/[id]/moderation-audit/route.ts", import.meta.url);
const resolverPath = new URL("../lib/admin-moderation-authorship.ts", import.meta.url);
const componentPath = new URL("../components/admin/moderation-authorship.tsx", import.meta.url);
const detailPath = new URL("../components/admin/admin-restaurant-detail.tsx", import.meta.url);
const listPath = new URL("../components/admin/admin-restaurants.tsx", import.meta.url);

const { collectModerationAuthorIds, resolveModerationAuthor } = await import("../lib/admin-moderation-authorship.ts");

test("authorship resolution keeps restaurant submitter and each review author distinct", () => {
  const profiles = new Map([
    ["submitter", { id: "submitter", name: "Quem sugeriu", username: "sugeriu" }],
    ["reviewer-a", { id: "reviewer-a", name: "Primeira pessoa", username: "primeira" }],
    ["reviewer-b", { id: "reviewer-b", name: "Segunda pessoa", username: "segunda" }],
  ]);

  assert.deepEqual(collectModerationAuthorIds("submitter", ["reviewer-a", "reviewer-b", "reviewer-a"]), ["submitter", "reviewer-a", "reviewer-b"]);
  assert.equal(resolveModerationAuthor("submitter", profiles, false).username, "sugeriu");
  assert.equal(resolveModerationAuthor("reviewer-a", profiles, false).username, "primeira");
  assert.equal(resolveModerationAuthor("reviewer-b", profiles, false).username, "segunda");
});

test("authorship resolution exposes only confirmed absence and failure states", () => {
  const profiles = new Map([["known", { id: "known", name: "Disponível", username: "disponivel" }]]);
  assert.deepEqual(resolveModerationAuthor(null, profiles, false), { state: "missing_link" });
  assert.deepEqual(resolveModerationAuthor("removed", profiles, false), { state: "unavailable", id: "removed" });
  assert.deepEqual(resolveModerationAuthor("known", profiles, true), { state: "error", id: "known" });
});

test("admin moderation resolves restaurant and review authors in one authorized batch", async () => {
  const [route, resolver] = await Promise.all([readFile(routePath, "utf8"), readFile(resolverPath, "utf8")]);
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /administrator\?\.role !== "admin"/);
  assert.match(route, /\.eq\("restaurant_id", restaurant\.id\)/);
  assert.match(route, /select\("id, name, username"\)\.in\("id", authorIds\)/);
  assert.match(route, /restaurant\.submitted_by/);
  assert.match(route, /review\.user_id/);
  assert.match(resolver, /state: "missing_link"/);
  assert.match(resolver, /state: "unavailable"/);
  assert.match(resolver, /state: "error"/);
});

test("moderation UI distinguishes authorship states and never uses the legacy fallback", async () => {
  const [component, detail, list] = await Promise.all([componentPath, detailPath, listPath].map((path) => readFile(path, "utf8")));
  assert.match(component, /Carregando autor…/);
  assert.match(component, /Autoria não registrada/);
  assert.match(component, /Perfil indisponível/);
  assert.match(component, /Não foi possível carregar o autor/);
  assert.match(component, /Restaurante sugerido por/);
  assert.match(component, /Review escrita por/);
  assert.match(component, /Tentar novamente/);
  assert.match(detail, /<ModerationAuthorship restaurantId=\{restaurant\.id\}\s*\/>/);
  assert.doesNotMatch(detail, /Legado/);
  assert.doesNotMatch(list, /Legado/);
});

test("the moderation audit keeps pending content behind an administrative route", async () => {
  const route = await readFile(routePath, "utf8");
  assert.match(route, /export const dynamic = "force-dynamic"/);
  assert.doesNotMatch(route, /SERVICE_ROLE_KEY/);
  assert.doesNotMatch(route, /createSupabaseServiceRoleClient/);
});
