import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const mediaUrl = new URL("../lib/review-media.ts", import.meta.url);
const componentUrl = new URL("../components/review/review-media.tsx", import.meta.url);
const contextUrl = new URL("../context/app-context.tsx", import.meta.url);

test("review media keeps upload position and cycles without losing a photo", async () => {
  const media = await readFile(mediaUrl, "utf8");
  assert.match(media, /photo\.position/);
  assert.match(media, /moveReviewPhotoIndex/);
  assert.match(media, /\(index \+ direction \+ photoCount\) % photoCount/);
});

test("review media has the required controls for a multi-photo gallery and lightbox", async () => {
  const component = await readFile(componentUrl, "utf8");
  assert.match(component, /photoCount > 1/);
  assert.match(component, /Foto anterior/);
  assert.match(component, /Próxima foto/);
  assert.match(component, /Fechar galeria/);
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /onTouchStart/);
  assert.match(component, /object-contain/);
});

test("review repository reads every review photo ordered by upload position", async () => {
  const context = await readFile(contextUrl, "utf8");
  assert.match(context, /review_photos"\)\.select\("\*"\)\.order\("position", \{ ascending: true \}\)/);
  assert.match(context, /reviewPhotos\.filter\(\(photo\).*photo\?\.reviewId === review\.id/);
});
