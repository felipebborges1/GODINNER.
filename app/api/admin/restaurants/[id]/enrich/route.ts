import { NextResponse } from "next/server";
import { searchGooglePlaces } from "@/lib/google-place-discovery";
import { verifyDuoGourmet } from "@/lib/duo-gourmet";
import { matchGoogleRestaurant } from "@/lib/google-place-match";
import { mapRestaurant } from "@/lib/supabase/mappers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  let google: "existing" | "matched" | "unmatched" | "ambiguous" | "error" = restaurant.google_place_id ? "existing" : "unmatched";
  if (!restaurant.google_place_id) {
    try {
      const match = matchGoogleRestaurant(restaurant, await searchGooglePlaces(`${restaurant.name}, ${restaurant.address}, ${restaurant.city}`));
      google = match.status;
      if (match.candidate) update.google_place_id = match.candidate.placeId;
    } catch { /* Google enrichment is intentionally non-blocking. */ google = "error"; }
  }

  const duo = verifyDuoGourmet(restaurant);
  if (duo.checked) {
    update.accepts_duo_gourmet = duo.acceptsDuoGourmet;
    update.duo_gourmet_checked_at = new Date().toISOString();
  }

  if (!Object.keys(update).length) return NextResponse.json({ restaurant: mapRestaurant(restaurant), google, duo });
  let mutation = supabase.from("restaurants").update(update).eq("id", restaurant.id).eq("status", "published");
  // Do not overwrite a Google link supplied by another administrator meanwhile.
  if (update.google_place_id) mutation = mutation.is("google_place_id", null);
  const { data: updated, error: updateError } = await mutation.select("*").single();
  if (updateError || !updated) return NextResponse.json({ error: "Não foi possível atualizar o vínculo. Recarregue e tente novamente.", google: "error" }, { status: 409 });
  return NextResponse.json({ restaurant: mapRestaurant(updated), google, duo });
}
