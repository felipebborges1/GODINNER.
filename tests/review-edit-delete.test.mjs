import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL("../supabase/migrations/20260825000000_review_edit_delete.sql", import.meta.url);
const rpcFixUrl = new URL("../supabase/migrations/20260825000001_fix_review_update_rpc.sql", import.meta.url);
const photoFixUrl = new URL("../supabase/migrations/20260825000002_fix_review_update_photo_ambiguity.sql", import.meta.url);
const immutableRatingUrl = new URL("../supabase/migrations/20260825000003_preserve_review_ratings_on_edit.sql", import.meta.url);

test("review edit/delete migration enforces owner or admin and keeps social references on edit", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  assert.match(migration, /reviews_owner_or_admin_update/);
  assert.match(migration, /reviews_owner_or_admin_delete/);
  assert.match(migration, /review\.user_id = auth\.uid\(\) or public\.is_admin\(\)/);
  assert.match(migration, /update public\.reviews as review/);
  assert.doesNotMatch(migration.slice(migration.indexOf("update_review_owned"), migration.indexOf("delete_review_owned")), /delete from public\.review_(likes|comments)/);
});

test("review deletion cascades social data and returns private photo paths for explicit cleanup", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const deletion = migration.slice(migration.indexOf("delete_review_owned"));
  assert.match(deletion, /select coalesce\(array_agg\(storage_path\)/);
  assert.match(deletion, /delete from public\.reviews where id = target\.id/);
  assert.match(deletion, /visited_entry_removed/);
  assert.match(migration, /storage_review_photos_owner_or_admin_delete/);
});

test("review edit UI changes content only and deletion requires confirmation", async () => {
  const [form, menu, card] = await Promise.all([
    readFile(new URL("../components/review/review-edit-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/review/review-owner-actions.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/review/review-card.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(form, /RatingInput|foodRating|serviceRating|ambienceRating|Sua nota/);
  assert.match(form, /A avaliação permanece a mesma\./);
  assert.match(form, /PhotoUploader/);
  assert.match(menu, /Excluir esta experiência\?/);
  assert.match(menu, /Essa ação removerá sua avaliação, fotos e interações associadas\./);
  assert.match(card, /Editado/);
});

test("review edit RPC corrections apply in order for a fresh database", async () => {
  const [initial, rpcFix, photoFix] = await Promise.all([
    readFile(migrationUrl, "utf8"),
    readFile(rpcFixUrl, "utf8"),
    readFile(photoFixUrl, "utf8"),
  ]);
  assert.match(initial, /delete from public\.review_photos where review_id = target\.id/);
  assert.match(rpcFix, /delete from public\.review_photos where review_photos\.review_id = target\.id/);
  assert.match(photoFix, /requested_photo/);
  assert.match(photoFix, /photo_entry jsonb/);
  assert.doesNotMatch(photoFix, /jsonb_array_elements\(p_photos\) photo;/);
});

test("latest review edit RPC leaves both legacy and dimensional rating fields untouched", async () => {
  const [migration, repository, context] = await Promise.all([
    readFile(immutableRatingUrl, "utf8"),
    readFile(new URL("../lib/data/repositories.ts", import.meta.url), "utf8"),
    readFile(new URL("../context/app-context.tsx", import.meta.url), "utf8"),
  ]);
  const update = migration.slice(migration.indexOf("create or replace function public.update_review_owned"));
  const updateStatement = update.slice(update.indexOf("update public.reviews as review"), update.indexOf("delete from public.review_photos"));
  assert.doesNotMatch(update, /p_(food|service|ambience)_rating|p_rating_method|p_rating\b/);
  assert.doesNotMatch(updateStatement, /\b(rating|rating_method|food_rating|service_rating|ambience_rating)\b/);
  assert.doesNotMatch(repository.slice(repository.indexOf("updateReviewPersisted"), repository.indexOf("deleteReviewPersisted")), /p_(food|service|ambience)_rating/);
  const clientUpdate = context.slice(context.indexOf("const updateReview ="), context.indexOf("const deleteReview ="));
  assert.doesNotMatch(clientUpdate, /foodRating: draft|serviceRating: draft|ambienceRating: draft|ratingMethod: "dimensions"/);
  assert.doesNotMatch(clientUpdate, /refreshRestaurantReviewStats/);
});
