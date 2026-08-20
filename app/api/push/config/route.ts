import { NextResponse } from "next/server";
import { getWebPushPublicConfig } from "@/lib/push/config";

export const dynamic = "force-dynamic";

export function GET() { return NextResponse.json(getWebPushPublicConfig(), { headers: { "Cache-Control": "no-store" } }); }
