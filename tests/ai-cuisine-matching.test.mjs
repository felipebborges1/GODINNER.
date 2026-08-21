import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import TypeScript from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../lib/ai/cuisine.ts", import.meta.url), "utf8");
const compiled = TypeScript.transpileModule(source, {
  compilerOptions: { module: TypeScript.ModuleKind.CommonJS, target: TypeScript.ScriptTarget.ES2022 },
});
const compiledModule = { exports: {} };
new Function("exports", "require", "module", compiled.outputText)(compiledModule.exports, require, compiledModule);
const { cuisineTermsMatch, restaurantMatchesCuisine } = compiledModule.exports;

test("matches explicit Portuguese cuisine gender and accent variants", () => {
  assert.equal(cuisineTermsMatch("Japonesa", "japonesa"), true);
  assert.equal(cuisineTermsMatch("Japonês", "japones"), true);
  assert.equal(cuisineTermsMatch("Italiano", "italiana"), true);
  assert.equal(cuisineTermsMatch("Mexicano", "mexicana"), true);
});

test("does not turn unknown cuisines into a match", () => {
  assert.equal(restaurantMatchesCuisine(["Japonesa", "Sushi"], "marciana"), false);
});
