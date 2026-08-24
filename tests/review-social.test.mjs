import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import TypeScript from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../lib/review-social.ts", import.meta.url), "utf8");
const compiled = TypeScript.transpileModule(source, { compilerOptions: { module: TypeScript.ModuleKind.CommonJS, target: TypeScript.ScriptTarget.ES2022 } });
const compiledModule = { exports: {} };
new Function("exports", "require", "module", compiled.outputText)(compiledModule.exports, require, compiledModule);
const { canManageReviewComment, emptyReviewSocialSummary, toggleReviewLikeSummary, validateReviewComment } = compiledModule.exports;

test("toggles a like optimistically while keeping the count consistent", () => {
  const liked = toggleReviewLikeSummary(emptyReviewSocialSummary());
  assert.deepEqual(liked, { likeCount: 1, commentCount: 0, likedByMe: true });
  assert.deepEqual(toggleReviewLikeSummary(liked), emptyReviewSocialSummary());
});

test("validates and normalizes comments before persistence", () => {
  assert.equal(validateReviewComment("   ").error, "Escreva um comentário para publicar.");
  assert.equal(validateReviewComment("a".repeat(501)).error, "Use no máximo 500 caracteres.");
  assert.deepEqual(validateReviewComment("  Muito   bom  "), { body: "Muito bom", error: null });
});

test("only a comment owner or admin can manage a comment", () => {
  const comment = { id: "comment-1", reviewId: "review-1", userId: "user-a", body: "Ótimo", createdAt: "2026-08-24T00:00:00Z", updatedAt: "2026-08-24T00:00:00Z" };
  assert.equal(canManageReviewComment(comment, "user-a", false), true);
  assert.equal(canManageReviewComment(comment, "user-b", false), false);
  assert.equal(canManageReviewComment(comment, "user-b", true), true);
});

test("social migration keeps authorship and visibility inside RLS", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260824000000_review_social_engagement.sql", import.meta.url), "utf8");
  assert.match(migration, /user_id uuid not null default auth\.uid\(\)/);
  assert.match(migration, /review_likes_insert_own/);
  assert.match(migration, /review_comments_delete_owner_or_admin/);
  assert.match(migration, /user_id = auth\.uid\(\) or public\.is_admin\(\)/);
  assert.match(migration, /security_invoker = true/);
});

test("visitor_comment_click_opens_loginwall", async () => {
  const reviewActions = await readFile(new URL("../components/review/review-social-actions.tsx", import.meta.url), "utf8");
  assert.match(reviewActions, /onClick=\{\(\) => \{ if \(!requireLogin\(\)\) return; void openComments\(\); \}\}/);
});
