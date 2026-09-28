import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { attributeConfirmedUser } from "@/lib/personal-invites";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const auth = await createSupabaseServerClient();
  if (!auth) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const status = await attributeConfirmedUser(user);
  return NextResponse.json({ status }, { headers: { "Cache-Control": "private, no-store" } });
}
