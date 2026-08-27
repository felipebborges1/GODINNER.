import type { CommentMention, User } from "@/types";

export const MENTION_USERNAME_PATTERN = "[a-z0-9_.]{2,32}";

export type ActiveMention = { query: string; start: number; end: number };

/** Mirrors the database username rule, but only the database resolves identities. */
export function getActiveMention(value: string, cursor: number): ActiveMention | null {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(^|[^a-z0-9_.])@([a-z0-9_.]{0,32})$/i);
  if (!match) return null;
  const prefixLength = match[1]?.length ?? 0;
  const start = (match.index ?? 0) + prefixLength;
  return { query: match[2].toLowerCase(), start, end: cursor };
}

export function findMentionUsers(users: User[], query: string, limit = 6) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return users
    .filter((user) => user.username.startsWith(normalized) || user.name.toLowerCase().includes(normalized))
    .sort((left, right) => {
      const leftPrefix = left.username.startsWith(normalized) ? 0 : 1;
      const rightPrefix = right.username.startsWith(normalized) ? 0 : 1;
      return leftPrefix - rightPrefix || left.username.localeCompare(right.username, "pt-BR");
    })
    .slice(0, limit);
}

export function commentSegments(body: string, mentions: CommentMention[]) {
  const mentionsByUsername = new Map(mentions.map((mention) => [mention.username.toLowerCase(), mention]));
  const segments: Array<string | CommentMention> = [];
  const matcher = /(^|[^a-z0-9_.])@([a-z0-9_.]{2,32})/gi;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(body))) {
    const prefix = match[1] ?? "";
    const username = match[2].toLowerCase();
    const mention = mentionsByUsername.get(username);
    const mentionStart = match.index + prefix.length;
    const mentionEnd = mentionStart + username.length + 1;
    if (!mention) continue;
    if (mentionStart > cursor) segments.push(body.slice(cursor, mentionStart));
    segments.push(mention);
    cursor = mentionEnd;
  }
  if (cursor < body.length) segments.push(body.slice(cursor));
  return segments;
}

export function insertMention(value: string, activeMention: ActiveMention, username: string) {
  const suffix = value.slice(activeMention.end);
  const separator = suffix.startsWith(" ") || !suffix ? "" : " ";
  return `${value.slice(0, activeMention.start)}@${username}${separator}${suffix}`;
}
