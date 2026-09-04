import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const signedUrlTtlMs = 4 * 60 * 1000;
const signedUrlCache = new Map<string, { expiresAt: number; signedUrl: string }>();

export async function GET(_request: Request, context: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await context.params;
  if (!uuidPattern.test(photoId)) return new NextResponse(null, { status: 404 });

  const cached = signedUrlCache.get(photoId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.redirect(cached.signedUrl, { headers: { "Cache-Control": "private, max-age=240" } });
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return new NextResponse(null, { status: 404 });

  const { data: photo } = await supabase
    .from("review_photos")
    .select("storage_path, reviews!inner(restaurants!inner(status))")
    .eq("id", photoId)
    .eq("reviews.restaurants.status", "published")
    .maybeSingle();

  if (!photo?.storage_path) return new NextResponse(null, { status: 404 });

  const signed = await supabase.storage.from("review-photos").createSignedUrl(photo.storage_path, 5 * 60);
  if (signed.error || !signed.data?.signedUrl) return new NextResponse(null, { status: 404 });

  signedUrlCache.set(photoId, { signedUrl: signed.data.signedUrl, expiresAt: Date.now() + signedUrlTtlMs });

  return NextResponse.redirect(signed.data.signedUrl, {
    headers: { "Cache-Control": "private, max-age=240" },
  });
}
