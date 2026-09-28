import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const auth = await createSupabaseServerClient();
  if (!auth) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createSupabaseServiceRoleClient();
  if (!db) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { error } = await db.from("personal_invite_codes").insert({ inviter_id: user.id });
  if (error && error.code !== "23505") return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data: invite, error: readError } = await db.from("personal_invite_codes").select("code").eq("inviter_id", user.id).single();
  if (readError || !invite) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const baseUrl = process.env.VERCEL_ENV === "preview" ? new URL(request.url).origin : SITE_URL;
  return NextResponse.json({ url: `${baseUrl}/i/${invite.code}` }, { headers: { "Cache-Control": "private, no-store" } });
}
