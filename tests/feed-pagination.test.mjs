import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/feed-pagination.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const pagination = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

function review(id, createdAt) {
  return { id, createdAt };
}

test("pages keep a review unique even when upstream repeats it", () => {
  const pageOne = [review("a", "2026-09-03T10:00:00Z"), review("b", "2026-09-03T09:00:00Z")];
  const pageTwo = [review("b", "2026-09-03T09:00:00Z"), review("c", "2026-09-03T08:00:00Z")];
  const pageThree = [review("a", "2026-09-03T10:00:00Z"), review("d", "2026-09-03T07:00:00Z")];
  assert.deepEqual(pagination.dedupeReviewsById([...pageOne, ...pageTwo, ...pageThree]).map((item) => item.id), ["a", "b", "c", "d"]);
});

test("stable ordering resolves equal timestamps by review id", () => {
  const timestamp = "2026-09-03T10:00:00Z";
  assert.deepEqual(pagination.orderReviewsForFeed([review("a", timestamp), review("c", timestamp), review("b", timestamp)]).map((item) => item.id), ["c", "b", "a"]);
});

test("refresh and back-navigation merges do not reintroduce review ids", () => {
  const current = [review("a", "2026-09-03T10:00:00Z"), review("b", "2026-09-03T09:00:00Z")];
  const refreshed = [review("a", "2026-09-03T10:00:00Z"), review("b", "2026-09-03T09:00:00Z"), review("c", "2026-09-03T08:00:00Z")];
  assert.deepEqual(pagination.dedupeReviewsById([...current, ...refreshed]).map((item) => item.id), ["a", "b", "c"]);
});

test("progressive feed pages stop at the end without repeating a review", () => {
  const activities = [
    review("a", "2026-09-03T10:00:00Z"), review("b", "2026-09-03T09:00:00Z"), review("c", "2026-09-03T08:00:00Z"),
    review("d", "2026-09-03T07:00:00Z"), review("e", "2026-09-03T06:00:00Z"),
  ];
  const pageSize = 2;
  const firstPage = pagination.nextFeedVisibleCount(0, activities.length, pageSize);
  const secondPage = pagination.nextFeedVisibleCount(firstPage, activities.length, pageSize);
  const thirdPage = pagination.nextFeedVisibleCount(secondPage, activities.length, pageSize);

  assert.deepEqual(activities.slice(0, firstPage).map((item) => item.id), ["a", "b"]);
  assert.deepEqual(activities.slice(0, secondPage).map((item) => item.id), ["a", "b", "c", "d"]);
  assert.deepEqual(activities.slice(0, thirdPage).map((item) => item.id), ["a", "b", "c", "d", "e"]);
  assert.equal(pagination.nextFeedVisibleCount(thirdPage, activities.length, pageSize), activities.length);
});
