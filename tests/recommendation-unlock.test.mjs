import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import TypeScript from "typescript";

async function loadUnlockHelpers() {
  const source = await readFile(new URL("../lib/recommendations/unlock.ts", import.meta.url), "utf8");
  const compiled = TypeScript.transpileModule(source, { compilerOptions: { module: TypeScript.ModuleKind.CommonJS, target: TypeScript.ScriptTarget.ES2020 } }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", "module", compiled)(compiledModule.exports, compiledModule);
  return compiledModule.exports;
}

const validReview = { rating: 4.2 };

test("recommendation unlock only represents the valid 2 to 3 transition", async () => {
  const { unlocksRecommendations } = await loadUnlockHelpers();
  assert.equal(unlocksRecommendations(0, validReview), false, "0 → 1");
  assert.equal(unlocksRecommendations(1, validReview), false, "1 → 2");
  assert.equal(unlocksRecommendations(2, validReview), true, "2 → 3");
  assert.equal(unlocksRecommendations(3, validReview), false, "3 → 4");
  assert.equal(unlocksRecommendations(4, validReview), false, "existing 3+");
  assert.equal(unlocksRecommendations(2, { rating: 7 }), false, "a non-R1-valid review cannot unlock");
});

test("the server migration persists a one-time unlock and an independent modal acknowledgement", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260903000000_recommendation_unlock_milestone.sql", import.meta.url), "utf8");
  assert.match(migration, /recommendations_unlocked_at timestamptz/);
  assert.match(migration, /recommendations_unlock_seen_at timestamptz/);
  assert.match(migration, /publication_key uuid/);
  assert.match(migration, /reviews_publication_key_owner_idx/);
  assert.match(migration, /valid_review_count = 2/);
  assert.match(migration, /recommendations_unlocked_at is null/);
  assert.match(migration, /claim_recommendation_unlock_modal/);
  assert.match(migration, /recommendations_unlock_seen_at is null/);
  assert.match(migration, /on delete set null/);
});

test("publication and UI source keep retries, failures, edits, and deletes out of the unlock path", async () => {
  const [context, form, repository] = await Promise.all([
    readFile(new URL("../context/app-context.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/review/review-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/data/repositories.ts", import.meta.url), "utf8"),
  ]);
  assert.match(form, /publicationKey\.current \?\?= crypto\.randomUUID\(\)/);
  assert.match(repository, /publish_review_with_recommendation_unlock/);
  assert.match(context, /updateReview = useCallback/);
  assert.match(context, /deleteReview = useCallback/);
  assert.doesNotMatch(context.match(/const updateReview[\s\S]*?const deleteReview/)?.[0] ?? "", /claimRecommendationUnlock/);
  assert.match(repository, /claim_recommendation_unlock_modal/);
});

test("unlock UI is accessible and directs the user to the Discover anchor", async () => {
  const [dialog, success, section, analytics] = await Promise.all([
    readFile(new URL("../components/discover/recommendation-unlock-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/review/review-success.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/discover/recommendation-section.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/analytics.ts", import.meta.url), "utf8"),
  ]);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /event\.key === "Escape"/);
  assert.match(dialog, /event\.key !== "Tab"/);
  assert.match(section, /prefers-reduced-motion/);
  assert.match(success, /router\.push\("\/#recommendations"\)/);
  assert.match(section, /id="recommendations"/);
  assert.match(success, /recommendation_unlock_modal_viewed/);
  assert.match(success, /recommendation_unlock_cta_clicked/);
  assert.match(analytics, /recommendation_unlocked/);
});
