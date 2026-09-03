import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { parseDuoPartners } from "../scripts/duo-bh-nova-lima-catalog.mjs";

test("DG3 keeps only partners whose official Duo URL belongs to the requested city", () => {
  const html = `
    <div class="restaurant-card" data-name="Akane Cozinha Japonesa" data-culinary="Japonesa" data-district="Belvedere"><a href="/restaurantes/belo-horizonte/akane"></a></div>
    <div class="restaurant-card" data-name="Outra unidade" data-culinary="Italiana" data-district="Vila da Serra"><a href="/restaurantes/nova-lima/outra-unidade"></a></div>
  `;
  assert.deepEqual(parseDuoPartners(html, "belo-horizonte"), [{
    name: "Akane Cozinha Japonesa", cuisine: "Japonesa", neighborhood: "Belvedere",
    duoUrl: "https://www.duogourmet.com.br/restaurantes/belo-horizonte/akane", duoCity: "belo-horizonte",
  }]);
});

test("DG3 import preserves unknown editorial price and never persists Google photos", async () => {
  const source = await readFile(new URL("../scripts/duo-bh-nova-lima-catalog.mjs", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20260903170000_allow_unknown_restaurant_price_range.sql", import.meta.url), "utf8");
  assert.match(source, /price_range: null/);
  assert.match(source, /accepts_duo_gourmet: true/);
  assert.doesNotMatch(source, /cover_photo_url:\s*result\.google/);
  assert.match(migration, /alter column price_range drop not null/i);
});
