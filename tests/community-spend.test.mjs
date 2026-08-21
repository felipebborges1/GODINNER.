import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import TypeScript from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../lib/community-spend.ts", import.meta.url), "utf8");
const compiled = TypeScript.transpileModule(source, { compilerOptions: { module: TypeScript.ModuleKind.CommonJS, target: TypeScript.ScriptTarget.ES2022 } });
const compiledModule = { exports: {} };
new Function("exports", "require", "module", compiled.outputText)(compiledModule.exports, require, compiledModule);
const { calculateCommunitySpend } = compiledModule.exports;

const review = (amountPerPerson) => ({ amountPerPerson });

test("uses the first valid reported spend during Beta", () => {
  assert.deepEqual(calculateCommunitySpend([review(90)]), { average: 90, experienceCount: 1 });
});

test("calculates the arithmetic mean of valid reported spends", () => {
  assert.deepEqual(calculateCommunitySpend([review(80), review(100)]), { average: 90, experienceCount: 2 });
  assert.deepEqual(calculateCommunitySpend([review(80), review(100), review(120)]), { average: 100, experienceCount: 3 });
  assert.deepEqual(calculateCommunitySpend([review(80), review(85), review(90), review(95), review(700)]), { average: 210, experienceCount: 5 });
});

test("ignores invalid spends without removing valid outliers", () => {
  assert.deepEqual(calculateCommunitySpend([review(null), review(undefined), review(0), review(-25), review("90"), review(700)]), { average: 700, experienceCount: 1 });
  assert.equal(calculateCommunitySpend([review(null), review(0), review(-1)]), null);
});
