import { NextRequest, NextResponse } from "next/server";
import { searchGooglePlaces } from "@/lib/google-place-discovery";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { query?: unknown; position?: { latitude?: unknown; longitude?: unknown } };
    const query = typeof body.query === "string" ? body.query : "";
    const latitude = Number(body.position?.latitude);
    const longitude = Number(body.position?.longitude);
    const position = Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : undefined;
    return NextResponse.json({ places: await searchGooglePlaces(query, { position }) });
  } catch {
    return NextResponse.json({ error: "Não conseguimos buscar lugares agora. Você pode tentar novamente ou preencher manualmente." }, { status: 502 });
  }
}
