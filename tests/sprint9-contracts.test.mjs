import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = await readFile(new URL("../supabase/migrations/20260813000000_initial_schema.sql", import.meta.url), "utf8");
const operations = await readFile(new URL("../supabase/migrations/20260813000001_transactional_operations.sql", import.meta.url), "utf8");
const browserClient = await readFile(new URL("../lib/supabase/browser.ts", import.meta.url), "utf8");
const storageClient = await readFile(new URL("../lib/supabase/storage.ts", import.meta.url), "utf8");
const pushMigration = await readFile(new URL("../supabase/migrations/20260820000000_web_push_follow_poc.sql", import.meta.url), "utf8");
const pushConfig = await readFile(new URL("../lib/push/config.ts", import.meta.url), "utf8");
const pushFollowRoute = await readFile(new URL("../app/api/push/follow/route.ts", import.meta.url), "utf8");
const pushSubscriptionRoute = await readFile(new URL("../app/api/push/subscription/route.ts", import.meta.url), "utf8");
const appContext = await readFile(new URL("../context/app-context.tsx", import.meta.url), "utf8");

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

test("web push follow POC is feature-flagged and subscription ownership stays private", () => {
  assert.match(pushConfig, /GODINNER_WEB_PUSH_ENABLED === "true"/);
  assert.match(pushConfig, /WEB_PUSH_VAPID_PRIVATE_KEY/);
  assert.match(pushMigration, /create table if not exists public\.push_subscriptions/);
  assert.match(pushMigration, /push_subscriptions_own_select/);
  assert.match(pushMigration, /user_id = auth\.uid\(\)/);
  assert.match(pushMigration, /create trigger follows_queue_push_event after insert on public\.follows/);
  assert.match(pushMigration, /claim_follow_push_event/);
  assert.match(pushSubscriptionRoute, /getWebPushConfig\(\)\.enabled/);
  assert.doesNotMatch(pushSubscriptionRoute, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(pushFollowRoute, /claim_follow_push_event/);
  assert.match(pushFollowRoute, /auth\.user\.id === followingId/);
  assert.match(appContext, /if \(!existing\) void fetch\("\/api\/push\/follow"/);
});
