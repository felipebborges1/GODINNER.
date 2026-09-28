import "server-only";

import { cookies } from "next/headers";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { attributionEligibility, firstPublicName, INVITE_COOKIE, isActiveVisit, validInviteCode, validVisitToken } from "@/lib/personal-invite-rules";

export { firstPublicName, INVITE_COOKIE, validInviteCode };

export async function inviteByCode(code: string) {
  if (!validInviteCode(code)) return null;
  const db = createSupabaseServiceRoleClient();
  if (!db) return null;
  const { data: invite, error } = await db.from("personal_invite_codes").select("inviter_id").eq("code", code).maybeSingle();
  if (error || !invite) return null;
  const { data: profile } = await db.from("profiles").select("id, name, avatar_url").eq("id", invite.inviter_id).maybeSingle();
  return profile ? { inviterId: profile.id, name: profile.name, avatar: profile.avatar_url } : null;
}

export async function currentVisit(token: unknown) {
  if (!validVisitToken(token)) return null;
  const db = createSupabaseServiceRoleClient();
  if (!db) return null;
  const { data, error } = await db.from("personal_invite_visits").select("token, inviter_id, opened_at, expires_at").eq("token", token).maybeSingle();
  return !error && data && isActiveVisit(data) ? data : null;
}

export async function visitFromCookie() {
  return currentVisit((await cookies()).get(INVITE_COOKIE)?.value);
}

export async function attributeConfirmedUser(user: { id: string; created_at: string; confirmed_at?: string | null }) {
  if (!user.confirmed_at) return "unconfirmed";
  const db = createSupabaseServiceRoleClient();
  if (!db) return "unavailable";
  const { data: signup, error: signupError } = await db.from("personal_invite_signups").select("visit_token").eq("invitee_id", user.id).maybeSingle();
  if (signupError) return "unavailable";
  const visit = await currentVisit(signup?.visit_token) ?? await visitFromCookie();
  if (!visit) return "no_valid_visit";
  const eligibility = attributionEligibility(user, visit);
  if (eligibility !== "eligible") return eligibility;
  const { error } = await db.from("personal_invite_attributions").insert({ invitee_id: user.id, inviter_id: visit.inviter_id, visit_token: visit.token });
  if (!error) return "attributed";
  if (error.code === "23505") return "already_attributed";
  return "failed";
}
