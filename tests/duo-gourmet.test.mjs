import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20260903150000_add_duo_gourmet_indicator.sql", import.meta.url), "utf8");
const card = await readFile(new URL("../components/restaurant/restaurant-card.tsx", import.meta.url), "utf8");
const profile = await readFile(new URL("../components/restaurant/restaurant-profile.tsx", import.meta.url), "utf8");
const mapper = await readFile(new URL("../lib/supabase/mappers.ts", import.meta.url), "utf8");

test("stores Duo Gourmet status as a nullable tri-state flag", () => {
  assert.match(migration, /accepts_duo_gourmet boolean default null/);
  assert.match(migration, /true confirmed, false explicit non-partner, null unknown/);
});

test("backfills only controlled high-confidence matches and never infers false", () => {
  for (const slug of ["akane-cozinha-japonesa-belvedere", "restaurante-benvindo-lourdes", "kei-cozinha-japonesa-vila-da-serra", "valle-gastronomico"]) assert.match(migration, new RegExp(slug));
  assert.doesNotMatch(migration, /set accepts_duo_gourmet = false/i);
  assert.match(migration, /address ilike/);
});

test("surfaces the indicator only for confirmed partners with a profile disclaimer", () => {
  assert.match(card, /restaurant\.acceptsDuoGourmet &&/);
  assert.match(profile, /restaurant\.acceptsDuoGourmet &&/);
  assert.match(profile, /Benefício sujeito às regras e disponibilidade do Duo Gourmet\./);
  assert.match(mapper, /acceptsDuoGourmet: row\.accepts_duo_gourmet \?\? undefined/);
});
