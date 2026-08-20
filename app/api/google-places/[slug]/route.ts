import { NextRequest, NextResponse } from "next/server";
import { getGooglePlaceConfig, getGooglePlaceCover, getGooglePlacePhotoUri } from "@/lib/google-places";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;

  try {
    const config = await getGooglePlaceConfig(slug);
    if (!config) return NextResponse.json({ error: "Foto do Google Maps indisponível." }, { status: 404 });
    const { photo } = await getGooglePlaceCover(config);
    const variant = request.nextUrl.searchParams.get("variant") === "profile" ? "profile" : "card";
    if (request.nextUrl.searchParams.get("media") === "1") {
      const photoUri = await getGooglePlacePhotoUri(photo.name, variant === "profile" ? 1600 : 720);
      const response = NextResponse.redirect(photoUri, 307);
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      return response;
    }

    const imageUrl = `/api/google-places/${slug}?media=1&variant=${variant}`;
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
