import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import TypeScript from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../lib/user-initials.ts", import.meta.url), "utf8");
const compiled = TypeScript.transpileModule(source, { compilerOptions: { module: TypeScript.ModuleKind.CommonJS, target: TypeScript.ScriptTarget.ES2022 } });
const compiledModule = { exports: {} };
new Function("exports", "require", "module", compiled.outputText)(compiledModule.exports, require, compiledModule);
const { getUserInitials } = compiledModule.exports;

test("creates safe initials from names", () => {
  assert.equal(getUserInitials("Felipe Borges"), "FB");
  assert.equal(getUserInitials("João"), "J");
  assert.equal(getUserInitials("  Marcela   Silva  "), "MS");
  assert.equal(getUserInitials("Érica Ávila"), "ÉÁ");
  assert.equal(getUserInitials(""), "?");
});
