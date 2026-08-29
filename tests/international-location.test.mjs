import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadAddressParser() {
  const source = await readFile(new URL("../lib/restaurant-location.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

test("restaurant location accepts generic cities and never substitutes mock BH coordinates on submit", async () => {
  const context = await readFile(new URL("../context/app-context.tsx", import.meta.url), "utf8");
  const types = await readFile(new URL("../types/index.ts", import.meta.url), "utf8");
  assert.match(context, /city: string/);
  assert.match(types, /city: string/);
  assert.match(context, /Marque a localização do restaurante no mapa para continuar/);
  assert.doesNotMatch(context, /mockRestaurantCoordinates/);
});

test("Google address parsing supports address shapes outside Brazil without requiring a neighborhood", async () => {
  const parser = await readFile(new URL("../lib/restaurant-location.ts", import.meta.url), "utf8");
  const picker = await readFile(new URL("../components/restaurant/location-picker.tsx", import.meta.url), "utf8");
  const form = await readFile(new URL("../components/restaurant/new-restaurant-client.tsx", import.meta.url), "utf8");
  assert.match(parser, /"locality", "postal_town", "administrative_area_level_2", "administrative_area_level_1"/);
  assert.match(parser, /country: get\("country"\)/);
  assert.match(picker, /parseRestaurantAddress/);
  assert.doesNotMatch(picker, /region=BR/);
  assert.match(form, /label="Cidade" error=\{errors\.city\}/);
  assert.doesNotMatch(form, /next\.neighborhood/);
});

test("address parser resolves Belo Horizonte and Madrid without inventing a neighborhood", async () => {
  const { parseRestaurantAddress } = await loadAddressParser();
  const beloHorizonte = parseRestaurantAddress({
    formatted_address: "Av. Afonso Pena, Belo Horizonte - MG, Brasil",
    address_components: [
      { long_name: "Belo Horizonte", types: ["locality", "political"] },
      { long_name: "Funcionários", types: ["sublocality_level_1", "political"] },
      { long_name: "Minas Gerais", types: ["administrative_area_level_1", "political"] },
      { long_name: "Brasil", types: ["country", "political"] },
    ],
  });
  const madrid = parseRestaurantAddress({
    formatted_address: "C. de Alcalá, Madrid, España",
    address_components: [
      { long_name: "Madrid", types: ["locality", "political"] },
      { long_name: "Comunidad de Madrid", types: ["administrative_area_level_1", "political"] },
      { long_name: "España", types: ["country", "political"] },
    ],
  });
  assert.deepEqual(beloHorizonte, { address: "Av. Afonso Pena, Belo Horizonte - MG, Brasil", city: "Belo Horizonte", neighborhood: "Funcionários", region: "Minas Gerais", country: "Brasil" });
  assert.deepEqual(madrid, { address: "C. de Alcalá, Madrid, España", city: "Madrid", neighborhood: undefined, region: "Comunidad de Madrid", country: "España" });
});

test("location failures keep manual address entry available with safe feedback", async () => {
  const picker = await readFile(new URL("../components/restaurant/location-picker.tsx", import.meta.url), "utf8");
  assert.match(picker, /Permissão de localização negada/);
  assert.match(picker, /Você pode marcar o local no mapa ou preencher manualmente/);
  assert.match(picker, /Não conseguimos preencher o endereço automaticamente/);
});

test("Discover uses a real location when available and does not present BH as nearby outside the catalog", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(page, /distanceKm\(position, restaurant\.coordinates!\)/);
  assert.match(page, /Ainda não temos lugares próximos de você/);
  assert.match(page, /actionHref="\/search"/);
});
