import "server-only";

import webpush from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWebPushConfig } from "./config";

type Subscription = { endpoint: string; p256dh: string; auth: string };

function safeProfilePath(username: string) { return `/user/${encodeURIComponent(username)}`; }
function isExpiredSubscription(error: unknown) { return Boolean(error && typeof error === "object" && "statusCode" in error && ([404, 410] as number[]).includes(Number((error as { statusCode?: number }).statusCode))); }

export async function sendFollowPush({ recipientId, actorName, actorUsername }: { recipientId: string; actorName: string; actorUsername: string }) {
  const config = getWebPushConfig();
  if (!config.enabled) return;
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const { data: subscriptions } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", recipientId);
  if (!subscriptions?.length) return;
  webpush.setVapidDetails(config.subject, config.vapidPublicKey, config.vapidPrivateKey);
  const payload = JSON.stringify({ title: "GODINNER", body: `${actorName || "Uma pessoa"} começou a seguir você.`, url: safeProfilePath(actorUsername) });
  const attempts = await Promise.allSettled(subscriptions.map((subscription: Subscription) => webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload)));
  const expired = attempts.flatMap((attempt, index) => attempt.status === "rejected" && isExpiredSubscription(attempt.reason) ? [subscriptions[index].endpoint] : []);
  if (expired.length) await admin.from("push_subscriptions").delete().eq("user_id", recipientId).in("endpoint", expired);
}
