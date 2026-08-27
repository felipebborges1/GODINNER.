export type AnalyticsEvent =
  | "discover_viewed"
  | "search_performed"
  | "filter_applied"
  | "restaurant_viewed"
  | "want_to_visit_added"
  | "want_to_visit_removed"
  | "list_created"
  | "restaurant_added_to_list"
  | "review_started"
  | "review_published"
  | "user_followed"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "people_discovery_viewed"
  | "ai_search_started"
  | "ai_search_completed"
  | "ai_search_no_results"
  | "ai_search_failed"
  | "ai_recommendation_clicked"
  | "profile_photo_added"
  | "profile_photo_changed"
  | "profile_photo_removed"
  | "review_liked"
  | "review_unliked"
  | "review_comment_created"
  | "review_edited"
  | "review_deleted"
  | "notification_center_opened"
  | "notification_opened"
  | "notifications_mark_all_read";

type AnalyticsProperties = Record<string, string | number | boolean | undefined>;

/**
 * A deliberately tiny analytics boundary for beta testing.
 * It keeps event names and non-sensitive properties stable without adding an SDK.
 */
export function trackEvent(name: AnalyticsEvent, properties: AnalyticsProperties = {}) {
  if (typeof window === "undefined") return;
  const safeProperties = Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  );
  window.dispatchEvent(new CustomEvent("godinner:analytics", { detail: { name, properties: safeProperties } }));
  if (process.env.NODE_ENV !== "production") console.debug(`[analytics] ${name}`, safeProperties);
}
