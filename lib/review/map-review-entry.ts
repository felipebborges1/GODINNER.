export function mapReviewUrl(query = "") {
  const params = new URLSearchParams();
  const name = query.trim().replace(/\s+/g, " ");
  if (name) params.set("name", name);
  const suffix = params.toString();
  return suffix ? `/review/map?${suffix}` : "/review/map";
}
