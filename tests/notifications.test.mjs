import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import TypeScript from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../lib/notifications.ts", import.meta.url), "utf8");
const compiled = TypeScript.transpileModule(source, { compilerOptions: { module: TypeScript.ModuleKind.CommonJS, target: TypeScript.ScriptTarget.ES2022 } });
const compiledModule = { exports: {} };
new Function("exports", "require", "module", compiled.outputText)(compiledModule.exports, require, compiledModule);
const { NOTIFICATIONS_PAGE_SIZE, formatRelativeTime, notificationCopy, notificationDestination } = compiledModule.exports;

const actor = { id: "actor", username: "julia", name: "Júlia" };
const restaurant = { id: "restaurant", slug: "merci", name: "Merci" };
const review = { id: "review", restaurantId: "restaurant" };
const base = { id: "notice", recipientUserId: "recipient", actorUserId: "actor", reviewId: null, restaurantId: null, commentId: null, createdAt: "2026-08-27T12:00:00Z", readAt: null };

test("notification copy and destinations use relationships rather than persisted copy", () => {
  assert.equal(notificationCopy({ ...base, type: "follow" }, actor), "Júlia começou a seguir você.");
  assert.equal(notificationDestination({ ...base, type: "follow" }, actor), "/user/julia");
  const like = { ...base, type: "review_like", reviewId: "review", restaurantId: "restaurant" };
  assert.equal(notificationCopy(like, actor, restaurant), "Júlia curtiu sua avaliação do Merci.");
  assert.equal(notificationDestination(like, actor, review, restaurant), "/restaurant/merci");
  const mention = { ...base, type: "comment_mention", reviewId: "review", restaurantId: "restaurant", commentId: "comment" };
  assert.equal(notificationCopy(mention, actor, restaurant), "Júlia mencionou você em um comentário no Merci.");
  assert.equal(notificationDestination(mention, actor, review, restaurant), "/restaurant/merci?review=review&comment=comment");
  const reply = { ...base, type: "comment_reply", reviewId: "review", restaurantId: "restaurant", commentId: "reply" };
  assert.equal(notificationCopy(reply, actor, restaurant), "Júlia respondeu ao seu comentário no Merci.");
  assert.equal(notificationDestination(reply, actor, review, restaurant), "/restaurant/merci?review=review&comment=reply");
  assert.equal(notificationDestination(like, actor, undefined, restaurant), null);
});

test("relative time follows the compact notification copy", () => {
  const now = new Date("2026-08-27T12:00:00Z");
  assert.equal(formatRelativeTime("2026-08-27T11:59:30Z", now), "Agora");
  assert.equal(formatRelativeTime("2026-08-27T11:45:00Z", now), "15 min");
  assert.equal(formatRelativeTime("2026-08-27T09:00:00Z", now), "3 h");
  assert.equal(formatRelativeTime("2026-08-26T12:00:00Z", now), "Ontem");
  assert.equal(NOTIFICATIONS_PAGE_SIZE, 20);
});

test("notification migration generates social events and keeps writes private", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260827000000_in_app_notifications.sql", import.meta.url), "utf8");
  assert.match(migration, /notifications_no_self check \(recipient_user_id <> actor_user_id\)/);
  assert.match(migration, /follows_notify_in_app/);
  assert.match(migration, /review_likes_notify_in_app/);
  assert.match(migration, /review_comments_notify_in_app/);
  assert.match(migration, /review_likes_remove_in_app_notification/);
  assert.match(migration, /on delete cascade/);
  assert.match(migration, /notifications_recipient_read/);
  assert.match(migration, /revoke all on public\.notifications from anon, authenticated/);
  assert.match(migration, /mark_notification_read/);
  assert.match(migration, /mark_all_notifications_read/);
  assert.match(migration, /notifications_recipient_unread_idx/);
});

test("notification UI has a private center, badge and accessible read actions", async () => {
  const center = await readFile(new URL("../components/notifications/notification-center.tsx", import.meta.url), "utf8");
  const bell = await readFile(new URL("../components/notifications/notification-bell.tsx", import.meta.url), "utf8");
  assert.match(center, /Marcar todas as notificações como lidas/);
  assert.match(center, /Você ainda não tem notificações\./);
  assert.match(center, /Não lida/);
  assert.match(center, /Carregar mais/);
  assert.match(bell, /Notificações, \$\{countLabel\} não lidas/);
});
