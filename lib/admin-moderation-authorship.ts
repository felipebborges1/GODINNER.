export type ModerationAuthor =
  | { state: "available"; id: string; name: string; username: string }
  | { state: "missing_link" }
  | { state: "unavailable"; id: string }
  | { state: "error"; id: string };

export type ModerationProfile = { id: string; name: string; username: string };

export function collectModerationAuthorIds(restaurantSubmitterId: string | null, reviewAuthorIds: Array<string | null>) {
  return [...new Set([restaurantSubmitterId, ...reviewAuthorIds].filter((authorId): authorId is string => Boolean(authorId)))];
}

export function resolveModerationAuthor(
  authorId: string | null,
  profilesById: Map<string, ModerationProfile>,
  profileLookupFailed: boolean,
): ModerationAuthor {
  if (!authorId) return { state: "missing_link" };
  if (profileLookupFailed) return { state: "error", id: authorId };

  const profile = profilesById.get(authorId);
  return profile
    ? { state: "available", id: profile.id, name: profile.name, username: profile.username }
    : { state: "unavailable", id: authorId };
}
