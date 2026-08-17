import { NextRequest, NextResponse } from "next/server";
import { getGooglePlaceConfig, getGooglePlaceCover } from "@/lib/google-places";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;

  try {
    const config = await getGooglePlaceConfig(slug);
    if (!config) return NextResponse.json({ error: "Foto do Google Maps indisponível." }, { status: 404 });
    const { photo } = await getGooglePlaceCover(config);
    const variant = request.nextUrl.searchParams.get("variant") === "profile" ? "profile" : "card";
    const imageUrl = `/api/google-places/${slug}/photo?name=${encodeURIComponent(photo.name)}&variant=${variant}`;
    const attribution = photo.authorAttributions?.[0];

    return NextResponse.json({
      imageUrl,
      attribution: attribution ? { displayName: attribution.displayName, uri: attribution.uri } : null,
      sourceUri: photo.googleMapsUri ?? null,
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar Google Places.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
