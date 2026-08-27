import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import TypeScript from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../lib/comment-mentions.ts", import.meta.url), "utf8");
const compiled = TypeScript.transpileModule(source, { compilerOptions: { module: TypeScript.ModuleKind.CommonJS, target: TypeScript.ScriptTarget.ES2022 } });
const compiledModule = { exports: {} };
new Function("exports", "require", "module", compiled.outputText)(compiledModule.exports, require, compiledModule);
const { commentSegments, findMentionUsers, getActiveMention, insertMention } = compiledModule.exports;

const users = [
  { id: "julia", username: "juliamolinari", name: "Júlia Molinari" },
  { id: "isaac", username: "isaac", name: "Isaac" },
  { id: "felipe", username: "felipe.borges", name: "Felipe Borges" },
];

test("detects the active mention at the cursor and preserves the surrounding text", () => {
  const body = "Muito bom @ju adorei";
  const active = getActiveMention(body, body.indexOf(" adorei"));
  assert.deepEqual(active, { query: "ju", start: 10, end: 13 });
  assert.equal(insertMention(body, active, "juliamolinari"), "Muito bom @juliamolinari adorei");
  assert.equal(getActiveMention("teste@email.com", "teste@email.com".length), null);
});

test("searches visible profiles by username prefix before display name", () => {
  assert.deepEqual(findMentionUsers(users, "jul").map((user) => user.username), ["juliamolinari"]);
  assert.deepEqual(findMentionUsers(users, "felipe").map((user) => user.username), ["felipe.borges"]);
  assert.deepEqual(findMentionUsers(users, ""), []);
});

test("renders only persisted mention relations as links", () => {
  const rendered = commentSegments("@juliamolinari veja isso em teste@email.com", [{ commentId: "comment", userId: "julia", username: "juliamolinari" }]);
  assert.equal(rendered[0].username, "juliamolinari");
  assert.equal(rendered.slice(1).join(""), " veja isso em teste@email.com");
  assert.deepEqual(commentSegments("@usuarioquenaoexiste", []), ["@usuarioquenaoexiste"]);
});

test("mention migration uses server-side exact matching, dedupe and cascading cleanup", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260827000001_review_comment_mentions.sql", import.meta.url), "utf8");
  assert.match(migration, /primary key \(comment_id, mentioned_user_id\)/);
  assert.match(migration, /on delete cascade/);
  assert.match(migration, /process_review_comment_mentions/);
  assert.match(migration, /comment_mention/);
  assert.match(migration, /on conflict do nothing/);
  assert.match(migration, /revoke all on public\.review_comment_mentions from anon, authenticated/);
});

test("comment UI keeps autocomplete keyboard accessible and avoids raw HTML", async () => {
  const component = await readFile(new URL("../components/review/review-social-actions.tsx", import.meta.url), "utf8");
  assert.match(component, /role="listbox"/);
  assert.match(component, /event\.key === "ArrowDown"/);
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /commentSegments\(item\.body, item\.mentions\)/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
});
