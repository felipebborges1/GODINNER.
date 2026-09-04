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
