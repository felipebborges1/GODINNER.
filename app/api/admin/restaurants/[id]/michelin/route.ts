import { NextResponse } from "next/server";
import { isOfficialMichelinGuideUrl, MICHELIN_RECOGNITION_STATES } from "@/lib/michelin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MichelinRecognitionState } from "@/types";

export const dynamic = "force-dynamic";

type MichelinSaveBody = {
  status?: unknown;
  stars?: unknown;
  editionYear?: unknown;
  sourceUrl?: unknown;
  attemptId?: unknown;
  retry?: unknown;
};

type MichelinRow = {
  michelin_status: MichelinRecognitionState;
  michelin_stars: number | null;
  michelin_edition_year: number | null;
  michelin_source_url: string | null;
  michelin_verified_at: string | null;
  michelin_verified_by: string | null;
};

function attemptReference(value: unknown) {
  return typeof value === "string" && /^[a-z0-9-]{16,80}$/i.test(value) ? value : crypto.randomUUID();
}

function sanitizeDiagnostic(value: unknown) {
  if (typeof value !== "string") return undefined;
  return value
    .replace(/https?:\/\/[^\s"']+/gi, "[url]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[id]")
    .replace(/\b(bearer|token|secret|password|apikey)\s*[=:]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 240);
}

function logSaveDiagnostic(input: {
  attemptId: string;
  phase: "request" | "authorization" | "reconcile" | "rpc" | "response";
  status: "started" | "failed" | "reconciled" | "succeeded";
  startedAt: number;
  error?: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null;
}) {
  const error = input.error;
  console.info("[michelin-save]", {
    attemptId: input.attemptId,
    phase: input.phase,
    status: input.status,
    durationMs: Date.now() - input.startedAt,
    database: error ? {
      code: error.code ?? undefined,
      message: sanitizeDiagnostic(error.message),
      details: sanitizeDiagnostic(error.details),
      hint: sanitizeDiagnostic(error.hint),
    } : undefined,
  });
}

function failure(message: string, status: number, attemptId: string) {
  return NextResponse.json({ error: `${message} Referência: ${attemptId}.`, attemptId }, { status });
}

function recognitionFromRow(row: MichelinRow) {
  return {
    state: row.michelin_status,
    stars: row.michelin_stars ?? undefined,
    editionYear: row.michelin_edition_year ?? undefined,
    sourceUrl: row.michelin_source_url ?? undefined,
    verifiedAt: row.michelin_verified_at ?? undefined,
    verifiedBy: row.michelin_verified_by ?? undefined,
  };
}

function matchesRequestedRecognition(row: MichelinRow, input: { status: MichelinRecognitionState; stars: number | null; editionYear: number | null; sourceUrl: string | null }) {
  return row.michelin_status === input.status
    && row.michelin_stars === (input.status === "verified_starred" ? input.stars : null)
    && row.michelin_edition_year === (input.status === "verified_starred" || input.status === "verified_no_star" ? input.editionYear : null)
    && row.michelin_source_url === (input.status === "verified_starred" || input.status === "verified_no_star" ? input.sourceUrl : null);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();
  const body = await request.json().catch(() => null) as MichelinSaveBody | null;
  const attemptId = attemptReference(body?.attemptId);
  logSaveDiagnostic({ attemptId, phase: "request", status: "started", startedAt });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return failure("Serviço indisponível.", 503, attemptId);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return failure("Não autorizado.", 401, attemptId);
  const { data: administrator } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (administrator?.role !== "admin") {
    logSaveDiagnostic({ attemptId, phase: "authorization", status: "failed", startedAt });
    return failure("Não autorizado.", 403, attemptId);
  }

  const status = body?.status;
  if (typeof status !== "string" || !MICHELIN_RECOGNITION_STATES.includes(status as MichelinRecognitionState)) return failure("Status Michelin inválido.", 400, attemptId);
  const stars = body?.stars === null || body?.stars === undefined || body.stars === "" ? null : Number(body.stars);
  const editionYear = body?.editionYear === null || body?.editionYear === undefined || body.editionYear === "" ? null : Number(body.editionYear);
  const sourceUrl = typeof body?.sourceUrl === "string" && body.sourceUrl.trim() ? body.sourceUrl.trim() : null;

  const hasValidYear = editionYear !== null && Number.isInteger(editionYear) && editionYear >= 1900 && editionYear <= 2100;
  const hasValidStars = stars !== null && Number.isInteger(stars) && stars >= 1 && stars <= 3;
  if (status === "verified_starred" && (!hasValidStars || !hasValidYear || !sourceUrl || !isOfficialMichelinGuideUrl(sourceUrl))) return failure("A confirmação exige 1–3 estrelas, edição e URL oficial do Guia Michelin.", 400, attemptId);
  if (status === "verified_no_star" && (stars !== null || !hasValidYear || !sourceUrl || !isOfficialMichelinGuideUrl(sourceUrl))) return failure("A ausência verificada exige edição e URL oficial do Guia Michelin.", 400, attemptId);

  const { id } = await context.params;
  const requested = {
    status: status as MichelinRecognitionState,
    stars,
    editionYear,
    sourceUrl,
  };

  if (body?.retry === true) {
    const { data: current, error: currentError } = await supabase
      .from("restaurants")
      .select("michelin_status, michelin_stars, michelin_edition_year, michelin_source_url, michelin_verified_at, michelin_verified_by")
      .eq("id", id)
      .maybeSingle();
    if (currentError) {
      logSaveDiagnostic({ attemptId, phase: "reconcile", status: "failed", startedAt, error: currentError });
      return failure("Não foi possível confirmar o estado anterior antes de repetir a gravação.", 500, attemptId);
    }
    if (current && matchesRequestedRecognition(current, requested)) {
      logSaveDiagnostic({ attemptId, phase: "reconcile", status: "reconciled", startedAt });
      return NextResponse.json({ recognition: recognitionFromRow(current), attemptId, reconciled: true });
    }
  }

  const { data, error } = await supabase.rpc("set_restaurant_michelin_recognition", {
    p_restaurant_id: id,
    p_status: requested.status,
    p_stars: status === "verified_starred" ? stars : null,
    p_edition_year: status === "verified_starred" || status === "verified_no_star" ? editionYear : null,
    p_source_url: status === "verified_starred" || status === "verified_no_star" ? sourceUrl : null,
  });
  if (error) {
    logSaveDiagnostic({ attemptId, phase: "rpc", status: "failed", startedAt, error });
    const schemaUnavailable = ["PGRST202", "42P01", "42703", "42883"].includes(error.code ?? "");
    return failure(schemaUnavailable ? "O suporte Michelin ainda não foi aplicado neste ambiente. Aplique a migration antes de salvar." : "Não foi possível salvar o reconhecimento Michelin.", schemaUnavailable ? 409 : 500, attemptId);
  }
  const saved = Array.isArray(data) ? data[0] : data;
  if (!saved) {
    logSaveDiagnostic({ attemptId, phase: "response", status: "failed", startedAt });
    return failure("A gravação não retornou uma confirmação verificável.", 502, attemptId);
  }
  logSaveDiagnostic({ attemptId, phase: "response", status: "succeeded", startedAt });
  return NextResponse.json({ recognition: recognitionFromRow(saved), attemptId });
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
