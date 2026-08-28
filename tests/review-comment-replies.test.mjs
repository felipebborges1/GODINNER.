import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("reply migration persists a single thread level and scopes authoring to the session", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260828000000_review_comment_replies.sql", import.meta.url), "utf8");
  assert.match(migration, /parent_comment_id uuid references public\.review_comments\(id\) on delete cascade/);
  assert.match(migration, /reply_to_comment_id uuid references public\.review_comments\(id\) on delete set null/);
  assert.match(migration, /root_comment_id := coalesce\(target_comment\.parent_comment_id, target_comment\.id\)/);
  assert.match(migration, /actor_id uuid := auth\.uid\(\)/);
  assert.match(migration, /invalid_reply_target/);
  assert.match(migration, /revoke insert on public\.review_comments from authenticated/);
  assert.match(migration, /grant execute on function public\.create_review_comment\(uuid, text, uuid\) to authenticated/);
});

test("reply notifications target the replied-to author without duplicate mention noise", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260828000000_review_comment_replies.sql", import.meta.url), "utf8");
  assert.match(migration, /comment_reply/);
  assert.match(migration, /notify_review_comment_reply/);
  assert.match(migration, /if new\.parent_comment_id is null then/);
  assert.match(migration, /reply_notification\.type = 'comment_reply'/);
  assert.match(migration, /recipient_id <> new\.user_id/);
  assert.match(migration, /on delete cascade/);
});

test("reply UI groups children under roots, supports cancellation and keeps visitors behind LoginWall", async () => {
  const component = await readFile(new URL("../components/review/review-social-actions.tsx", import.meta.url), "utf8");
  assert.match(component, /repliesByRoot/);
  assert.match(component, /Ver \$\{replies\.length\}/);
  assert.match(component, /Respondendo a @/);
  assert.match(component, /Cancelar/);
  assert.match(component, /startReply\(item\)/);
  assert.match(component, /if \(!requireLogin\(\)\) return;/);
  assert.match(component, /createReviewComment\(reviewId, validation\.body, replyTarget\?\.id \?\? null\)/);
});
