export const INVITE_DAYS = 30;
export const INVITE_COOKIE = "godinner_personal_invite";
const CODE_PATTERN = /^[0-9a-f]{32}$/;
const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InviteVisit = { token: string; inviter_id: string; opened_at: string; expires_at: string };
export type InviteAccount = { id: string; created_at: string; confirmed_at?: string | null };

export function validInviteCode(code: string) { return CODE_PATTERN.test(code); }
export function validVisitToken(token: unknown): token is string { return typeof token === "string" && TOKEN_PATTERN.test(token); }
export function firstPublicName(name: string) { return name.trim().split(/\s+/u)[0] || "Uma pessoa"; }
export function isActiveVisit(visit: InviteVisit, now = Date.now()) {
  return Number.isFinite(Date.parse(visit.expires_at)) && Date.parse(visit.expires_at) > now;
}
export function attributionEligibility(account: InviteAccount, visit: InviteVisit, now = Date.now()) {
  if (!account.confirmed_at) return "unconfirmed";
  if (!isActiveVisit(visit, now)) return "expired";
  if (visit.inviter_id === account.id) return "self";
  const createdAt = Date.parse(account.created_at);
  if (!Number.isFinite(createdAt) || createdAt <= Date.parse(visit.opened_at) || createdAt >= Date.parse(visit.expires_at)) return "existing_or_expired";
  return "eligible";
}
