const requests = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;

/** Small in-memory protection for the beta POC. It is intentionally best-effort on serverless instances. */
export function allowAiSearch(identifier: string) {
  const now = Date.now();
  const recent = (requests.get(identifier) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) return false;
  recent.push(now);
  requests.set(identifier, recent);
  return true;
}
