import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { currentVisit, inviteByCode, INVITE_COOKIE, validInviteCode } from "@/lib/personal-invites";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const code = body && typeof body.code === "string" ? body.code : "";
  if (!validInviteCode(code)) return NextResponse.json({ error: "invalid" }, { status: 404 });
  const inviter = await inviteByCode(code);
  if (!inviter) return NextResponse.json({ error: "invalid" }, { status: 404 });
  const existing = await currentVisit(request.cookies.get(INVITE_COOKIE)?.value);
  if (existing) return NextResponse.json({ accepted: true }, { headers: { "Cache-Control": "no-store" } });
  const db = createSupabaseServiceRoleClient();
  if (!db) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data: visit, error } = await db.from("personal_invite_visits").insert({ inviter_id: inviter.inviterId }).select("token, expires_at").single();
  if (error || !visit) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const response = NextResponse.json({ accepted: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(INVITE_COOKIE, visit.token, { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", expires: new Date(visit.expires_at) });
  return response;
}
