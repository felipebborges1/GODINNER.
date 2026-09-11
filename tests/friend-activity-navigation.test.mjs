import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadNavigation() {
  const source = await readFile(new URL("../lib/friend-activity-navigation.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled.outputText, { exports: compiledModule.exports, module: compiledModule });
  return compiledModule.exports;
}

test("friend activity moves exactly one photo or review for each direction", async () => {
  const { moveFriendActivityPosition } = await loadNavigation();
  const photoCounts = [1, 3, 0, 1];

  let position = { reviewIndex: 0, photoIndex: 0 };
  const forward = [];
  for (let index = 0; index < 5; index += 1) {
    position = moveFriendActivityPosition(position, photoCounts, 1);
    forward.push(position);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(forward)), [
    { reviewIndex: 1, photoIndex: 0 },
    { reviewIndex: 1, photoIndex: 1 },
    { reviewIndex: 1, photoIndex: 2 },
    { reviewIndex: 2, photoIndex: 0 },
    { reviewIndex: 3, photoIndex: 0 },
  ]);

  const backward = [];
  for (let index = 0; index < 5; index += 1) {
    position = moveFriendActivityPosition(position, photoCounts, -1);
    backward.push(position);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(backward)), [
    { reviewIndex: 2, photoIndex: 0 },
    { reviewIndex: 1, photoIndex: 2 },
    { reviewIndex: 1, photoIndex: 1 },
    { reviewIndex: 1, photoIndex: 0 },
    { reviewIndex: 0, photoIndex: 0 },
  ]);
});

test("friend activity respects both ends without a loop", async () => {
  const { moveFriendActivityPosition } = await loadNavigation();
  assert.deepEqual(JSON.parse(JSON.stringify(moveFriendActivityPosition({ reviewIndex: 0, photoIndex: 0 }, [1, 3], -1))), { reviewIndex: 0, photoIndex: 0 });
  assert.deepEqual(JSON.parse(JSON.stringify(moveFriendActivityPosition({ reviewIndex: 1, photoIndex: 2 }, [1, 3], 1))), { reviewIndex: 1, photoIndex: 2 });
});

test("friend activity coordinates a review boundary without changing the lightbox behavior", async () => {
  const [reviewMedia, card, carousel, avatar] = await Promise.all([
    readFile(new URL("../components/review/review-media.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/social/friend-activity-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/social/friend-activity-carousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ui/user-avatar.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(reviewMedia, /onBoundarySwipe\?\.\(direction\)/);
  assert.match(reviewMedia, /Foto da experiência indisponível/);
  assert.match(reviewMedia, /onError=\{\(\) => markPhotoFailed\(photo\.id\)\}/);
  assert.match(reviewMedia, /onPointerUp=\{\(event\) => handlePointerEnd\(event, false\)\}/);
  assert.match(card, /data-activity-media/);
  assert.match(card, /onNavigateReview/);
  assert.doesNotMatch(card, />Anterior</);
  assert.doesNotMatch(card, />Próxima</);
  assert.match(carousel, /targetPhotoIndex = direction === 1 \? 0 : Math\.max\(target\.review\.photos\.length - 1, 0\)/);
  assert.match(carousel, /mediaEager=\{index === activeIndex \|\| index === activeIndex \+ 1\}/);
  assert.match(avatar, /startedAt\.current = performance\.now\(\)/);
});
