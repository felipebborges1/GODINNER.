import { NextRequest, NextResponse } from "next/server";
import { searchGooglePlacesNearby } from "@/lib/google-place-discovery";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { latitude?: unknown; longitude?: unknown };
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return NextResponse.json({ error: "Localização inválida." }, { status: 400 });
    return NextResponse.json({ places: await searchGooglePlacesNearby({ latitude, longitude }) });
  } catch {
    return NextResponse.json({ error: "Não conseguimos encontrar lugares próximos agora. Você ainda pode buscar pelo nome." }, { status: 502 });
  }
}
