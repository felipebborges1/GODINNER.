import { NextRequest, NextResponse } from "next/server";
import { distanceKm } from "@/lib/distance";
import { getGooglePlaceDetails, mapGooglePlaceType } from "@/lib/google-place-discovery";
import { normalize } from "@/lib/search";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RestaurantRow } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type Overrides = { address?: unknown; city?: unknown; neighborhood?: unknown };

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 240) : fallback;
}

function slugFrom(name: string) {
  return normalize(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "restaurante";
}

function secondaryMatch(rows: RestaurantRow[], details: Awaited<ReturnType<typeof getGooglePlaceDetails>>) {
  const name = normalize(details.name);
  const address = normalize(details.address);
  return rows.find((restaurant) => {
    if (restaurant.google_place_id) return false;
    const sameName = normalize(restaurant.name) === name;
    const sameAddress = Boolean(address && normalize(restaurant.address) === address);
    const closeEnough = Number.isFinite(restaurant.latitude) && Number.isFinite(restaurant.longitude)
      && distanceKm({ latitude: restaurant.latitude, longitude: restaurant.longitude }, details.coordinates!) <= 0.1;
    return sameName && (sameAddress || closeEnough);
  });
}

export async function POST(request: NextRequest) {
  const client = await createSupabaseServerClient();
  if (!client) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Entre para avaliar este lugar." }, { status: 401 });

  try {
    const body = await request.json() as { placeId?: unknown; overrides?: Overrides };
    if (typeof body.placeId !== "string") return NextResponse.json({ error: "Local inválido." }, { status: 400 });
    const details = await getGooglePlaceDetails(body.placeId);
    const overrides = body.overrides ?? {};
    const address = stringValue(overrides.address, details.address);
    const city = stringValue(overrides.city, details.city ?? "");
    const neighborhood = stringValue(overrides.neighborhood, details.neighborhood ?? "");
    if (!address || !city) return NextResponse.json({ error: "Confira endereço e cidade antes de continuar." }, { status: 422 });

    const byPlace = await client.from("restaurants").select("*").eq("google_place_id", details.placeId).maybeSingle();
    if (byPlace.data) return NextResponse.json({ restaurant: byPlace.data, matched: "place_id" });
    if (byPlace.error) throw byPlace.error;

    const visible = await client.from("restaurants").select("*").limit(400);
    if (visible.error) throw visible.error;
    const secondary = secondaryMatch(visible.data ?? [], details);
    if (secondary) return NextResponse.json({ restaurant: secondary, matched: "secondary" });

    const mapped = mapGooglePlaceType(details);
    const slug = `${slugFrom(details.name)}-${Date.now().toString(36)}`;
    const inserted = await client.from("restaurants").insert({
      slug, name: details.name, address, city, neighborhood,
      latitude: details.coordinates!.latitude, longitude: details.coordinates!.longitude,
      category: mapped.category, cuisines: mapped.cuisine, price_range: "$$",
      instagram: null, website: null, phone: null, chef: "", cover_photo_url: null, cover_photo_path: null,
      google_place_id: details.placeId, status: "pending_review", submitted_by: userData.user.id,
      submitted_at: new Date().toISOString(), moderated_by: null, moderated_at: null,
      rejection_reason: null, merged_into_id: null,
    }).select("*").single();
    if (inserted.error || !inserted.data) {
      if (inserted.error?.code === "23505") return NextResponse.json({ error: "Este lugar já foi sugerido e está em análise." }, { status: 409 });
      throw inserted.error ?? new Error("Falha ao criar restaurante.");
    }
    return NextResponse.json({ restaurant: inserted.data, matched: "created" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não conseguimos preparar este lugar agora. Você pode preencher manualmente." }, { status: 502 });
  }
}
