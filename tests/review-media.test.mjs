import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const mediaUrl = new URL("../lib/review-media.ts", import.meta.url);
const gesturesUrl = new URL("../lib/gestures.ts", import.meta.url);
const componentUrl = new URL("../components/review/review-media.tsx", import.meta.url);
const contextUrl = new URL("../context/app-context.tsx", import.meta.url);

test("review media keeps upload position and cycles without losing a photo", async () => {
  const media = await readFile(mediaUrl, "utf8");
  assert.match(media, /photo\.position/);
  assert.match(media, /moveReviewPhotoIndex/);
  assert.match(media, /Math\.min\(Math\.max\(index \+ direction, 0\), photoCount - 1\)/);
  assert.match(media, /getReviewPhotoSwipeDirection/);
});

test("review media has the required controls for a multi-photo gallery and lightbox", async () => {
  const component = await readFile(componentUrl, "utf8");
  assert.match(component, /photoCount > 1/);
  assert.match(component, /Foto anterior/);
  assert.match(component, /Próxima foto/);
  assert.match(component, /Fechar galeria/);
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /onPointerDown/);
  assert.match(component, /touchAction: "pan-y"/);
  assert.match(component, /motion-reduce:transition-none/);
  assert.match(component, /object-contain/);
  assert.match(component, /loadedPhotoIds/);
  assert.match(component, /await image\.decode\(\)/);
  assert.match(component, /new window\.Image\(\)/);
  assert.match(component, /animate-pulse bg-stone-200/);
  assert.match(component, /Math\.abs\(index - activeIndex\) <= 1/);
  assert.match(component, /preload\(photo\.url, \{ as: "image", fetchPriority: "high" \}\)/);
  assert.match(component, /fetchPriority=\{isFirstPriorityMedia \? "high" : "auto"\}/);
  assert.match(component, /onPointerDown=\{startPointer\}/);
  assert.match(component, /onPointerUp=\{handlePointerEnd\}/);
  assert.match(component, /setPointerCapture/);
  assert.match(component, /touchAction: "pan-y"/);
});

test("review photo route reuses only a short-lived signed URL for published media", async () => {
  const route = await readFile(new URL("../app/api/review-photo/[photoId]/route.ts", import.meta.url), "utf8");
  assert.match(route, /signedUrlTtlMs = 4 \* 60 \* 1000/);
  assert.match(route, /signedUrlCache\.get\(photoId\)/);
  assert.match(route, /reviews!inner\(restaurants!inner\(status\)\)/);
  assert.match(route, /Cache-Control": "private, max-age=240/);
});

test("review photo navigation stops at both ends and ignores vertical or short gestures", async () => {
  const [source, gestureSource] = await Promise.all([readFile(mediaUrl, "utf8"), readFile(gesturesUrl, "utf8")]);
  const gestureCompiled = ts.transpileModule(gestureSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const gestureModule = { exports: {} };
  vm.runInNewContext(gestureCompiled.outputText, { exports: gestureModule.exports, module: gestureModule });
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled.outputText, { exports: compiledModule.exports, module: compiledModule, require: (path) => path === "@/lib/gestures" ? gestureModule.exports : {} });
  const { getReviewPhotoSwipeDirection, moveReviewPhotoIndex } = compiledModule.exports;

  assert.equal(moveReviewPhotoIndex(0, 5, -1), 0);
  assert.equal(moveReviewPhotoIndex(0, 5, 1), 1);
  assert.equal(moveReviewPhotoIndex(4, 5, 1), 4);
  assert.equal(moveReviewPhotoIndex(4, 5, -1), 3);
  assert.equal(getReviewPhotoSwipeDirection(200, 100, 120, 110), 1);
  assert.equal(getReviewPhotoSwipeDirection(120, 100, 200, 110), -1);
  assert.equal(getReviewPhotoSwipeDirection(200, 100, 180, 100), null);
  assert.equal(getReviewPhotoSwipeDirection(200, 100, 190, 180), null);
});

test("mobile gestures decide once from a shared threshold and keep vertical priority", async () => {
  const source = await readFile(gesturesUrl, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled.outputText, { exports: compiledModule.exports, module: compiledModule });
  const { getGestureIntent, getHorizontalSwipeDirection } = compiledModule.exports;

  assert.equal(getGestureIntent(4, 3), null);
  assert.equal(getGestureIntent(20, 50), "vertical");
  assert.equal(getGestureIntent(50, 15), "horizontal");
  assert.equal(getGestureIntent(20, 20), "vertical");
  assert.equal(getHorizontalSwipeDirection(200, 100, 120, 110), 1);
  assert.equal(getHorizontalSwipeDirection(200, 100, 180, 160), null);
});

test("review repository reads every review photo ordered by upload position", async () => {
  const context = await readFile(contextUrl, "utf8");
  assert.match(context, /review_photos"\)\.select\("\*"\)\.order\("position", \{ ascending: true \}\)/);
  assert.match(context, /const reviewPhotosByReviewId = new Map/);
  assert.match(context, /reviewPhotosByReviewId\.get\(review\.id\) \?\? \[\]/);
});
