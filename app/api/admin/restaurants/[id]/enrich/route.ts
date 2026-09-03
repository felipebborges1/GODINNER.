import { NextResponse } from "next/server";
import { searchGooglePlaces } from "@/lib/google-place-discovery";
import { verifyDuoGourmet } from "@/lib/duo-gourmet";
import { distanceKm } from "@/lib/distance";
import { normalize } from "@/lib/search";
import { mapRestaurant } from "@/lib/supabase/mappers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function googleMatch(restaurant: { name: string; address: string; city: string; latitude: number; longitude: number }, candidates: Awaited<ReturnType<typeof searchGooglePlaces>>) {
  return candidates.find((candidate) => {
    const sameName = normalize(candidate.name) === normalize(restaurant.name);
    const sameAddress = Boolean(candidate.address && normalize(candidate.address) === normalize(restaurant.address));
    const closeEnough = candidate.coordinates && Number.isFinite(restaurant.latitude) && Number.isFinite(restaurant.longitude)
      && distanceKm(candidate.coordinates, { latitude: restaurant.latitude, longitude: restaurant.longitude }) <= 0.1;
    return sameName && (sameAddress || closeEnough);
  });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const { id } = await context.params;
  const { data: restaurant, error } = await supabase.from("restaurants").select("*").eq("id", id).eq("status", "published").maybeSingle();
  if (error || !restaurant) return NextResponse.json({ error: "Restaurante não encontrado." }, { status: 404 });

  const update: { google_place_id?: string; accepts_duo_gourmet?: boolean | null; duo_gourmet_checked_at?: string } = {};
  if (!restaurant.google_place_id) {
    try {
      const candidate = googleMatch(restaurant, await searchGooglePlaces(`${restaurant.name}, ${restaurant.address}, ${restaurant.city}`));
      if (candidate) update.google_place_id = candidate.placeId;
    } catch { /* Google enrichment is intentionally non-blocking. */ }
  }

  const duo = verifyDuoGourmet(restaurant);
  if (duo.checked) {
    update.accepts_duo_gourmet = duo.acceptsDuoGourmet;
    update.duo_gourmet_checked_at = new Date().toISOString();
  }

  if (!Object.keys(update).length) return NextResponse.json({ restaurant: mapRestaurant(restaurant), google: restaurant.google_place_id ? "existing" : "unmatched", duo });
  const { data: updated, error: updateError } = await supabase.from("restaurants").update(update).eq("id", restaurant.id).select("*").single();
  if (updateError || !updated) return NextResponse.json({ restaurant: mapRestaurant(restaurant), google: "error", duo });
  return NextResponse.json({ restaurant: mapRestaurant(updated), google: update.google_place_id ? "matched" : restaurant.google_place_id ? "existing" : "unmatched", duo });
}
