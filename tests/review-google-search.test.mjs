import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { act, create } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
function compile(relative, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", source)(name => dependencies[name] ?? require(name), mod, mod.exports);
  return mod.exports;
}
const text = node => typeof node === "string" ? node : (node?.children ?? []).map(text).join("");
const place = { placeId: "public-google-id", name: "Cozinha da Nivia", address: "Endereço público", city: "Belo Horizonte", country: "Brasil", types: [] };
function restaurant(id, status = "published", submittedBy = null) {
  return { id, name: id, status, submittedBy, googlePlaceId: id, cuisine: ["Brasileira"], coverPhoto: { url: "/photo.jpg" }, godinnerRating: 0, city: "Belo Horizonte", neighborhood: "Centro" };
}
async function fixture(t, rows = [], initialQuery = "") {
  const requests = [], navigations = [], selected = [], timers = new Map();
  let timerId = 0;
  const originalFetch = globalThis.fetch, originalWindow = globalThis.window;
  globalThis.window = { setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); } };
  globalThis.fetch = (path, options) => new Promise(resolve => requests.push({ path, body: JSON.parse(options.body), resolve }));
  const hook = compile("../hooks/use-google-place-search.ts");
  const entry = compile("../lib/review/google-review-entry.ts");
  const { RestaurantSelector } = compile("../components/review/restaurant-selector.tsx", {
    "next/image": { __esModule: true, default: props => React.createElement("img", props) },
    "next/link": { __esModule: true, default: props => React.createElement("a", props) },
    "next/navigation": { useRouter: () => ({ push: url => navigations.push(url) }), useSearchParams: () => new URLSearchParams({ q: initialQuery }) },
    "lucide-react": { Search: () => null },
    "@/hooks/use-app-context": { useAppContext: () => ({ restaurants: [], currentUserId: "me" }) },
    "@/hooks/use-search-catalog": { useSearchCatalog: () => ({ restaurants: rows, isLoading: false, error: null }) },
    "@/hooks/use-google-place-search": hook,
    "@/lib/search": { normalize: value => value.toLowerCase() },
    "@/lib/review/map-review-entry": compile("../lib/review/map-review-entry.ts"),
    "@/lib/review/google-review-entry": entry,
  });
  let renderer;
  await act(async () => { renderer = create(React.createElement(RestaurantSelector, { onSelect: row => selected.push(row) })); });
  t.after(async () => {
    await act(async () => renderer.unmount());
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  });
  return {
    requests, navigations, selected,
    text: () => text(renderer.toJSON()),
    input: async value => { await act(async () => renderer.root.findByType("input").props.onChange({ target: { value } })); },
    flush: async () => { await act(async () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); }); },
    resolve: async (index, places = [], ok = true) => { await act(async () => requests[index].resolve({ ok, json: async () => ({ places, ...(!ok ? { error: "service unavailable" } : {}) }) })); },
    click: async label => { const button = renderer.root.findAllByType("button").find(node => text(node).includes(label)); assert.ok(button, label); await act(async () => button.props.onClick()); },
    link: () => renderer.root.findByType("a").props.href,
  };
}

test("+ debounces typing and uses the same Google endpoint as Home, without requiring GPS", async t => {
  const f = await fixture(t);
  await f.input("co"); await f.input("cozinha da nivea");
  assert.equal(f.requests.length, 0);
  await f.flush();
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].path, "/api/google-places/search");
  assert.deepEqual(f.requests[0].body, { query: "cozinha da nivea" });
  assert.match(f.text(), /Buscando lugares no Google/);
  await f.resolve(0, [place]);
  assert.match(f.text(), /Cozinha da Nivia/);
  assert.match(f.text(), /Dados fornecidos pelo Google/);
});

test("Google selection opens confirmation, preserving another city and creating no records", async t => {
  const f = await fixture(t, [], "Restaurante, Lisboa");
  await f.flush();
  assert.equal(f.requests[0].body.query, "Restaurante, Lisboa");
  await f.resolve(0, [{ ...place, city: "Lisboa", country: "Portugal" }]);
  await f.click("Cozinha da Nivia");
  const url = new URL(f.navigations[0], "https://example.test");
  assert.equal(url.pathname, "/restaurant/new");
  assert.equal(url.searchParams.get("placeId"), place.placeId);
  assert.equal(url.searchParams.get("city"), "Lisboa");
  assert.equal(f.requests.length, 1); // Only the read-only search; no creation endpoint.
});

test("uses full search catalog and selects already linked restaurant without creation", async t => {
  const row = restaurant(place.placeId);
  const f = await fixture(t, [row]);
  await f.input("cozinha"); await f.flush(); await f.resolve(0, [place]);
  await f.click("Cozinha da Nivia");
  assert.deepEqual(f.selected, [row]); assert.deepEqual(f.navigations, []);
});

test("does not expose another user's pending or rejected restaurant; own pending stays eligible", async t => {
  const f = await fixture(t, [restaurant("private", "pending_review", "other"), restaurant("rejected", "rejected"), restaurant("mine", "pending_review", "me")]);
  await f.input("private");
  assert.doesNotMatch(f.text(), /private/);
  await f.flush(); await f.resolve(0, [{ ...place, placeId: "private" }]);
  await f.click("Cozinha da Nivia");
  assert.equal(f.selected.length, 0); assert.equal(f.navigations.length, 1);
  await f.input("mine"); assert.match(f.text(), /Aguardando validação/);
  await f.click("mine"); assert.equal(f.selected[0].id, "mine");
});

test("query edits discard late results before the next debounce and clearing ends loading", async t => {
  const f = await fixture(t);
  await f.input("old"); await f.flush();
  await f.input("new"); await f.resolve(0, [{ ...place, name: "Stale" }]);
  assert.doesNotMatch(f.text(), /Stale/);
  await f.flush(); await f.resolve(1, [place]);
  assert.match(f.text(), /Cozinha da Nivia/);
  await f.input("new "); assert.match(f.text(), /Cozinha da Nivia/);
  await f.input(""); await f.flush();
  assert.doesNotMatch(f.text(), /Buscando lugares|Cozinha da Nivia/);
  assert.equal(f.requests.length, 2);
});

test("empty and failed searches retain map fallback and a bounded explicit retry", async t => {
  const f = await fixture(t);
  await f.input("um lugar"); await f.flush(); await f.resolve(0, [], false);
  assert.match(f.text(), /Não conseguimos buscar no Google/);
  assert.equal(f.link(), "/review/map?name=um+lugar");
  await f.click("Tentar novamente"); await f.resolve(1);
  assert.match(f.text(), /Nenhum lugar encontrado no Google/);
  assert.match(f.text(), /Marcar no mapa e avaliar/);
  assert.equal(f.requests.length, 2);
});

test("short terms do not request Google", async t => {
  const f = await fixture(t);
  await f.input("a"); await f.flush();
  assert.equal(f.requests.length, 0);
});
