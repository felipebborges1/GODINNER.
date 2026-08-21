import { NextRequest, NextResponse } from "next/server";
import { isAiSearchEnabled } from "@/lib/ai/config";
import { AiSearchInterpretationError, interpretAiSearchQuery, MAX_QUERY_LENGTH } from "@/lib/ai/intent";
import { rankAiRecommendations } from "@/lib/ai/ranking";
import { allowAiSearch } from "@/lib/ai/rate-limit";
import type { AiSearchPosition } from "@/lib/ai/types";
import { mapRestaurant, mapReview } from "@/lib/supabase/mappers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AiRouteStage = "openai_request" | "openai_response" | "structured_parse" | "schema_validation" | "catalog_query" | "ranking" | "unknown";

function logAiRouteFailure(stage: AiRouteStage, error: unknown) {
  const interpretationError = error instanceof AiSearchInterpretationError ? error : null;
  console.error("AI search route failure", {
    stage: interpretationError?.stage ?? stage,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : "Unknown error",
    httpStatus: interpretationError?.details.httpStatus ?? null,
    errorCode: interpretationError?.details.code ?? null,
    responseStatus: interpretationError?.details.responseStatus ?? null,
    incompleteReason: interpretationError?.details.incompleteReason ?? null,
    usage: interpretationError?.details.usage ?? null,
  });
}

function parsePosition(value: unknown): AiSearchPosition | null {
  if (!value || typeof value !== "object") return null;
  const { latitude, longitude } = value as Record<string, unknown>;
  return typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    ? { latitude, longitude }
    : null;
}

export async function POST(request: NextRequest) {
  if (!isAiSearchEnabled()) return NextResponse.json({ error: "A busca por IA não está disponível." }, { status: 404 });
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowAiSearch(forwardedFor)) return NextResponse.json({ error: "Muitas buscas em pouco tempo. Tente novamente em um minuto." }, { status: 429 });

  let body: { query?: unknown; position?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Consulta inválida." }, { status: 400 });
  }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query || query.length > MAX_QUERY_LENGTH) return NextResponse.json({ error: "Escreva uma busca de até 280 caracteres." }, { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const interpretation = await interpretAiSearchQuery(query, controller.signal);
    console.info("AI search OpenAI response", {
      stage: "openai_response",
      responseId: interpretation.responseId,
      responseStatus: interpretation.responseStatus,
      usage: interpretation.usage,
    });
    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: "Catálogo indisponível no momento." }, { status: 503 });
    const [restaurantsResponse, reviewsResponse] = await Promise.all([
      supabase.from("restaurants").select("*").eq("status", "published"),
      supabase.from("reviews").select("*"),
    ]);
    if (restaurantsResponse.error || reviewsResponse.error) {
      logAiRouteFailure("catalog_query", restaurantsResponse.error ?? reviewsResponse.error);
      return NextResponse.json({ error: "Não conseguimos consultar o catálogo agora." }, { status: 503 });
    }

    let result;
    try {
      result = rankAiRecommendations({
        restaurants: (restaurantsResponse.data ?? []).map(mapRestaurant),
        reviews: (reviewsResponse.data ?? []).map((review) => mapReview(review)),
        intent: interpretation.intent,
        position: parsePosition(body.position),
      });
    } catch (error) {
      logAiRouteFailure("ranking", error);
      return NextResponse.json({ error: "Não foi possível organizar os resultados agora. Tente novamente." }, { status: 502 });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logAiRouteFailure("unknown", error);
    return NextResponse.json({ error: "Não foi possível interpretar sua busca agora. Tente novamente." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
