import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home search reuses the shared restaurant matcher and remains on Discover", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /import \{ filterRestaurants \} from "@\/lib\/search"/);
  assert.match(page, /filterRestaurants\(eligibleRestaurants, \{ q: searchQuery \}/);
  assert.match(page, /<SearchBar value=\{searchQuery\}/);
  assert.doesNotMatch(page, /SearchBar navigateOnFocus/);
});

test("home search has a clear action and keeps advanced search available", async () => {
  const page = await readFile(new URL("../app\/page.tsx", import.meta.url), "utf8");
  assert.match(page, /onClear=\{\(\) => \{ setSearchQuery\(""\); resetExternalSearch\(\); \}\}/);
  assert.match(page, /Explorar filtros/);
  assert.match(page, /Nenhum lugar encontrado\./);
});
