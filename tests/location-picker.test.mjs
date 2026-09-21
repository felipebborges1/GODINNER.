import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { act, create } from "react-test-renderer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);

// Render the real component with isolated external services (no browser GPS,
// Google requests, Supabase or production data). Keep its actual React effects.
function compile(relative, dependencies) {
  const filename = fileURLToPath(new URL(relative, import.meta.url));
  const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", source)((name) => dependencies[name] ?? require(name), compiled, compiled.exports);
  return compiled.exports;
}

async function fixture() {
  const gps = [], geocodes = [], maps = [], markers = [], subscribers = new Set();
  let coordinates, address, renderer;
  let mapLoads = 0;
  const loader = { subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); } };
  const api = {
    Map: class {
      constructor() { this.listeners = {}; maps.push(this); }
      panTo(point) { this.center = point; }
      addListener(event, callback) { this.listeners[event] = callback; return { remove: () => { delete this.listeners[event]; } }; }
    },
    Marker: class {
      constructor(options) { this.position = options.position; this.visible = options.visible; markers.push(this); }
      setPosition(point) { this.position = point; }
      setVisible(visible) { this.visible = visible; }
      setMap(map) { this.map = map; }
      addListener() { return { remove() {} }; }
    },
    Geocoder: class { geocode(request, callback) { geocodes.push({ request, callback }); } },
  };
  const parser = compile("../lib/restaurant-location.ts", {});
  const { LocationPicker } = compile("../components/restaurant/location-picker.tsx", {
    "@/lib/google-maps-loader": { googleMapsLoader: () => loader, loadMapsLibraries: async (names) => { if (names.includes("maps")) mapLoads++; return { ...api }; } },
    "@/lib/restaurant-location": parser,
    "lucide-react": { MapPin: () => null, Navigation: () => null, X: () => null },
  });
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { geolocation: { getCurrentPosition(success, error, options) { gps.push({ success, error, options }); } } } });
  function Harness() {
    const [value, setValue] = React.useState();
    return React.createElement(LocationPicker, { value, onChange: (point) => { coordinates = point; setValue(point); }, onAddressResolved: (result) => { address = result; } });
  }
  await act(async () => { renderer = create(React.createElement(Harness), { createNodeMock: () => ({}) }); });
  const text = (node) => typeof node === "string" ? node : (node?.children ?? []).map(text).join("");
  const click = async (label) => {
    const button = renderer.root.findAllByType("button").find((node) => text(node).includes(label));
    assert.ok(button, `button ${label}`);
    await act(async () => button.props.onClick());
  };
  return {
    gps, geocodes, maps, markers, click,
    get coordinates() { return coordinates; }, get address() { return address; }, get mapLoads() { return mapLoads; },
    text: () => text(renderer.toJSON()),
    pin: async (lat, lng) => act(async () => maps.at(-1).listeners.click({ latLng: { lat: () => lat, lng: () => lng } })),
    locate: async (index, latitude, longitude) => act(async () => gps[index].success({ coords: { latitude, longitude } })),
    deny: async (index, code) => act(async () => gps[index].error({ code })),
    addressResult: async (index, status, value = "Endereço sintético") => act(async () => geocodes[index].callback(status === "OK" ? [{ formatted_address: value, address_components: [] }] : null, status)),
    authFailure: async () => act(async () => subscribers.forEach((fn) => fn("authorization"))),
    close: async () => {
      await act(async () => renderer.unmount());
      if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
      else delete globalThis.navigator;
    },
  };
}

test("direct picker loads without GPS; selection/address updates do not recreate map; close/reopen works", async () => {
  const f = await fixture();
  try {
    await f.click("Selecionar no mapa");
    assert.equal(f.maps.length, 1);
    assert.equal(f.gps.length, 0);
    await f.pin(10, 20);
    await f.addressResult(0, "OK");
    assert.deepEqual(f.coordinates, { latitude: 10, longitude: 20 });
    assert.equal(f.address.address, "Endereço sintético");
    assert.equal(f.maps.length, 1);
    await f.click("Fechar mapa");
    assert.equal(f.maps[0].listeners.click, undefined);
    await f.click("Selecionar no mapa");
    assert.equal(f.maps.length, 2);
    assert.equal(f.markers.at(-1).visible, true);
  } finally { await f.close(); }
});

test("GPS success displays selected position; geocoder failure retains it and reports address stage only", async () => {
  const f = await fixture();
  try {
    await f.click("Usar minha localização");
    await f.locate(0, 10, 20);
    assert.equal(f.markers.at(-1).visible, true);
    await f.addressResult(0, "REQUEST_DENIED");
    assert.deepEqual(f.coordinates, { latitude: 10, longitude: 20 });
    assert.match(f.text(), /Localização encontrada/);
    assert.match(f.text(), /As coordenadas selecionadas foram mantidas/);
    assert.doesNotMatch(f.text(), /Não foi possível carregar o mapa/);
  } finally { await f.close(); }
});

for (const [code, expected] of [[1, /Permissão de localização negada/], [2, /Posição indisponível/], [3, /timeout/]]) {
  test(`GPS error ${code} is distinct from map failure and allows a subsequent attempt`, async () => {
    const f = await fixture();
    try {
      await f.click("Usar minha localização");
      await f.deny(0, code);
      assert.match(f.text(), expected);
      await f.click("Selecionar no mapa");
      assert.equal(f.maps.length, 1);
      assert.doesNotMatch(f.text(), /Não foi possível carregar o mapa/);
      await f.click("Usar minha localização");
      await f.locate(1, 10, 20);
      await f.addressResult(0, "OK");
      assert.match(f.text(), /Localização encontrada/);
    } finally { await f.close(); }
  });
}

test("pending GPS is single flight and cannot replace a manually selected point", async () => {
  const f = await fixture();
  try {
    await f.click("Usar minha localização");
    await f.click("Buscando localização");
    assert.equal(f.gps.length, 1);
    await f.click("Selecionar no mapa");
    await f.pin(10, 20);
    await f.locate(0, 30, 40);
    assert.deepEqual(f.coordinates, { latitude: 10, longitude: 20 });
    assert.match(f.text(), /escolhido manualmente foi mantido/);
    await f.addressResult(0, "OK");
  } finally { await f.close(); }
});

test("late address for old point cannot overwrite the newest selection", async () => {
  const f = await fixture();
  try {
    await f.click("Selecionar no mapa");
    await f.pin(10, 20);
    await f.pin(30, 40);
    await f.addressResult(1, "OK", "Novo endereço");
    await f.addressResult(0, "OK", "Endereço antigo");
    assert.equal(f.address.address, "Novo endereço");
    assert.deepEqual(f.coordinates, { latitude: 30, longitude: 40 });
  } finally { await f.close(); }
});

test("Maps authorization failure has its own recovery message, preserves input and does not trigger GPS retries", async () => {
  const f = await fixture();
  try {
    await f.click("Selecionar no mapa");
    await f.pin(10, 20);
    await f.addressResult(0, "OK");
    await f.authFailure();
    assert.match(f.text(), /serviço de mapas não autorizou/);
    assert.match(f.text(), /não é uma falha do GPS/);
    assert.deepEqual(f.coordinates, { latitude: 10, longitude: 20 });
    assert.equal(f.gps.length, 0);
    assert.equal(f.mapLoads, 1);
  } finally { await f.close(); }
});
