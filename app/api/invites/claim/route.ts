import { NextResponse } from "next/server";
import { visitFromCookie } from "@/lib/personal-invites";

export async function GET() {
  const visit = await visitFromCookie();
  return NextResponse.json({ token: visit?.token ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}
