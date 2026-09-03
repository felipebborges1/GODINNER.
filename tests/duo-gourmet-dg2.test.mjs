import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indicator = await readFile(new URL("../components/ui/duo-gourmet-indicator.tsx", import.meta.url), "utf8");
const search = await readFile(new URL("../lib/search.ts", import.meta.url), "utf8");
const explorer = await readFile(new URL("../components/search/search-explorer.tsx", import.meta.url), "utf8");
const sheet = await readFile(new URL("../components/search/filter-sheet.tsx", import.meta.url), "utf8");
const approval = await readFile(new URL("../context/app-context.tsx", import.meta.url), "utf8");
const enrichment = await readFile(new URL("../app/api/admin/restaurants/[id]/enrich/route.ts", import.meta.url), "utf8");
const matcher = await readFile(new URL("../lib/duo-gourmet.ts", import.meta.url), "utf8");

test("uses the compact Duo Gourmet label", () => {
  assert.match(indicator, />Duo Gourmet</);
  assert.doesNotMatch(indicator, /Aceita Duo Gourmet/);
});

test("filters true and false strictly while keeping unknown out of both", () => {
  assert.match(search, /const duo = params\.duo === "true" \|\| params\.duo === "false"/);
  assert.match(search, /restaurant\.acceptsDuoGourmet === \(duo === "true"\)/);
  assert.match(sheet, /Duo Gourmet\?/, "FilterSheet exposes the Duo filter");
  assert.match(sheet, /duo=true\|Sim/);
  assert.match(sheet, /duo=false\|Não/);
  assert.match(explorer, /Duo Gourmet: Não/);
  assert.match(explorer, /setParam\(key\)/, "active chip removes the Duo URL value");
});

test("persists approval before non-blocking enrichment", () => {
  const published = approval.indexOf('update({ status: "published"');
  const enrichmentCall = approval.indexOf('/enrich');
  assert.ok(published >= 0 && enrichmentCall > published);
  assert.match(approval, /void fetch\(`\/api\/admin\/restaurants\/\$\{restaurantId\}\/enrich`/);
  assert.match(enrichment, /profile\?\.role !== "admin"/);
  assert.match(enrichment, /if \(!restaurant\.google_place_id\)/);
  assert.match(enrichment, /catch \{ \/\* Google enrichment is intentionally non-blocking/);
});

test("keeps Duo failures and partial-source absences unknown", () => {
  assert.match(matcher, /complete: false/);
  assert.match(matcher, /if \(source\.complete\) return \{ match: "NO_MATCH", acceptsDuoGourmet: false, checked: true \}/);
  assert.match(matcher, /return \{ match: "NO_MATCH", acceptsDuoGourmet: null, checked: false \}/);
  assert.match(enrichment, /if \(duo\.checked\)/);
});
