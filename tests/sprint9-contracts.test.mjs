import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = await readFile(new URL("../supabase/migrations/20260813000000_initial_schema.sql", import.meta.url), "utf8");
const operations = await readFile(new URL("../supabase/migrations/20260813000001_transactional_operations.sql", import.meta.url), "utf8");
const browserClient = await readFile(new URL("../lib/supabase/browser.ts", import.meta.url), "utf8");
const storageClient = await readFile(new URL("../lib/supabase/storage.ts", import.meta.url), "utf8");

test("schema defines the core tables and integrity constraints", () => {
  for (const table of ["profiles", "restaurants", "reviews", "review_photos", "restaurant_lists", "restaurant_list_items", "follows"]) assert.match(schema, new RegExp(`create table public\\.${table}`));
  assert.match(schema, /rating numeric\(3,1\).*between 0 and 10/);
  assert.match(schema, /follows_no_self/);
  assert.match(schema, /restaurant_lists_one_default_per_type/);
  assert.match(schema, /enable row level security/);
  assert.match(schema, /grant all on public\.profiles, public\.restaurants/);
});

test("database operations are transactional RPCs with authenticated execution", () => {
  assert.match(operations, /create or replace function public\.publish_review/);
  assert.match(operations, /create or replace function public\.merge_restaurant/);
  assert.match(operations, /revoke execute on function public\.publish_review/);
  assert.match(operations, /grant execute on function public\.merge_restaurant.*authenticated/s);
});

test("storage is private and browser code cannot access the service role", () => {
  assert.match(schema, /\('avatars', 'avatars', false/);
  assert.match(schema, /\('restaurant-submissions', 'restaurant-submissions', false/);
  assert.match(schema, /\('review-photos', 'review-photos', false/);
  assert.match(browserClient, /getSupabasePublicEnv/);
  assert.doesNotMatch(browserClient, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(storageClient, /createSignedUrl/);
  assert.doesNotMatch(storageClient, /getPublicUrl/);
});
