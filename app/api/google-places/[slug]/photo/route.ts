import { NextRequest, NextResponse } from "next/server";
import { getGooglePlaceConfig, getGooglePlacePhotoUri } from "@/lib/google-places";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const config = await getGooglePlaceConfig(slug);
  const photoName = request.nextUrl.searchParams.get("name") ?? "";
  if (!config || !photoName.startsWith(`places/${config.google_place_id}/photos/`)) {
    return NextResponse.json({ error: "Foto inválida." }, { status: 400 });
  }

  try {
    const maxWidthPx = request.nextUrl.searchParams.get("variant") === "profile" ? 1600 : 720;
    const photoUri = await getGooglePlacePhotoUri(photoName, maxWidthPx);
    const response = NextResponse.redirect(photoUri, 307);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao obter foto do Google Places.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
