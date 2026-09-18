import { NextResponse } from "next/server";
import { isOfficialMichelinGuideUrl, MICHELIN_RECOGNITION_STATES } from "@/lib/michelin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MichelinRecognitionState } from "@/types";

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data: administrator } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (administrator?.role !== "admin") return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

  const body = await request.json().catch(() => null) as { status?: unknown; stars?: unknown; editionYear?: unknown; sourceUrl?: unknown } | null;
  const status = body?.status;
  if (typeof status !== "string" || !MICHELIN_RECOGNITION_STATES.includes(status as MichelinRecognitionState)) return invalid("Status Michelin inválido.");
  const stars = body?.stars === null || body?.stars === undefined || body.stars === "" ? null : Number(body.stars);
  const editionYear = body?.editionYear === null || body?.editionYear === undefined || body.editionYear === "" ? null : Number(body.editionYear);
  const sourceUrl = typeof body?.sourceUrl === "string" && body.sourceUrl.trim() ? body.sourceUrl.trim() : null;

  const hasValidYear = editionYear !== null && Number.isInteger(editionYear) && editionYear >= 1900 && editionYear <= 2100;
  const hasValidStars = stars !== null && Number.isInteger(stars) && stars >= 1 && stars <= 3;
  if (status === "verified_starred" && (!hasValidStars || !hasValidYear || !sourceUrl || !isOfficialMichelinGuideUrl(sourceUrl))) return invalid("A confirmação exige 1–3 estrelas, edição e URL oficial do Guia Michelin.");
  if (status === "verified_no_star" && (stars !== null || !hasValidYear || !sourceUrl || !isOfficialMichelinGuideUrl(sourceUrl))) return invalid("A ausência verificada exige edição e URL oficial do Guia Michelin.");

  const { id } = await context.params;
  const { data, error } = await supabase.rpc("set_restaurant_michelin_recognition", {
    p_restaurant_id: id,
    p_status: status,
    p_stars: status === "verified_starred" ? stars : null,
    p_edition_year: status === "verified_starred" || status === "verified_no_star" ? editionYear : null,
    p_source_url: status === "verified_starred" || status === "verified_no_star" ? sourceUrl : null,
  });
  if (error) {
    const schemaUnavailable = ["PGRST202", "42P01", "42703", "42883"].includes(error.code ?? "");
    return NextResponse.json({ error: schemaUnavailable ? "O suporte Michelin ainda não foi aplicado neste ambiente. Aplique a migration antes de salvar." : "Não foi possível salvar o reconhecimento Michelin." }, { status: schemaUnavailable ? 409 : 500 });
  }
  return NextResponse.json({ recognition: {
    state: data.michelin_status,
    stars: data.michelin_stars ?? undefined,
    editionYear: data.michelin_edition_year ?? undefined,
    sourceUrl: data.michelin_source_url ?? undefined,
    verifiedAt: data.michelin_verified_at ?? undefined,
    verifiedBy: data.michelin_verified_by ?? undefined,
  } });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data: administrator } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (administrator?.role !== "admin") return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const { id } = await context.params;
  const { data, error } = await supabase.from("restaurant_michelin_recognition_history").select("id, michelin_status, michelin_stars, michelin_edition_year, michelin_source_url, verified_at, changed_at").eq("restaurant_id", id).order("changed_at", { ascending: false });
  if (error) {
    const schemaUnavailable = ["PGRST202", "PGRST205", "42P01", "42703"].includes(error.code ?? "");
    return NextResponse.json({ error: schemaUnavailable ? "O suporte Michelin ainda não foi aplicado neste ambiente. Aplique a migration para consultar o histórico." : "Não foi possível carregar o histórico Michelin." }, { status: schemaUnavailable ? 409 : 500 });
  }
  return NextResponse.json({ history: data });
}
