import "server-only";

type WebPushConfig = { enabled: boolean; vapidPublicKey: string; vapidPrivateKey: string; subject: string };

export function getWebPushConfig(): WebPushConfig {
  const vapidPublicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
  const vapidPrivateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim() ?? "";
  const enabled = process.env.GODINNER_WEB_PUSH_ENABLED === "true" && Boolean(vapidPublicKey && vapidPrivateKey && subject);
  return { enabled, vapidPublicKey, vapidPrivateKey, subject };
}

export function getWebPushPublicConfig() {
  const config = getWebPushConfig();
  return config.enabled ? { enabled: true, vapidPublicKey: config.vapidPublicKey } : { enabled: false };
}
