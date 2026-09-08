import { NextRequest, NextResponse } from "next/server";
import { resolveDeviceRegion } from "@/lib/google-geocoding";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { latitude?: unknown; longitude?: unknown };
    const region = await resolveDeviceRegion(Number(body.latitude), Number(body.longitude));
    return NextResponse.json({ region }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ region: null }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
