import type { InAppNotification, Restaurant, Review, User } from "@/types";

export const NOTIFICATIONS_PAGE_SIZE = 20;

export function notificationCopy(notification: InAppNotification, actor?: User, restaurant?: Restaurant) {
  const name = actor?.name ?? "Alguém";
  if (notification.type === "follow") return `${name} começou a seguir você.`;
  if (notification.type === "review_like") return `${name} curtiu sua avaliação${restaurant ? ` do ${restaurant.name}` : ""}.`;
  if (notification.type === "comment_mention") return `${name} mencionou você em um comentário${restaurant ? ` no ${restaurant.name}` : ""}.`;
  return `${name} comentou na sua avaliação${restaurant ? ` do ${restaurant.name}` : ""}.`;
}

export function notificationDestination(notification: InAppNotification, actor?: User, review?: Review, restaurant?: Restaurant) {
  if (notification.type === "follow") return actor ? `/user/${actor.username}` : null;
  if (!review || !restaurant) return null;
  const context = notification.commentId ? `?review=${encodeURIComponent(review.id)}&comment=${encodeURIComponent(notification.commentId)}` : "";
  return `/restaurant/${restaurant.slug}${context}`;
}

export function formatRelativeTime(value: string, now = new Date()) {
  const elapsedMs = Math.max(0, now.getTime() - new Date(value).getTime());
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  return `${days} d`;
}
