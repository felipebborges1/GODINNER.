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
  | "login_completed";

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
