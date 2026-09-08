import { NextRequest, NextResponse } from "next/server";
import { searchGooglePlaces } from "@/lib/google-place-discovery";
import { GooglePlacesRequestError, googlePlacesFailureFromUnknown, googlePlacesFailureMessage } from "@/lib/google-places-errors";

export const dynamic = "force-dynamic";

type SearchRequestBody = {
  query?: unknown;
  position?: { latitude?: unknown; longitude?: unknown };
  diagnostic?: { attemptId?: unknown; source?: unknown; manualRegionType?: unknown };
};

function previewDiagnosticsEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";
}

function safeDiagnosticValue(value: unknown, pattern: RegExp) {
  return typeof value === "string" && pattern.test(value) ? value : undefined;
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  let diagnostic: SearchRequestBody["diagnostic"];
  let query = "";
  let position: { latitude: number; longitude: number } | undefined;
  let requestBodyParsed = false;
  try {
    const body = await request.json() as SearchRequestBody;
    requestBodyParsed = true;
    query = typeof body.query === "string" ? body.query : "";
    diagnostic = body.diagnostic;
    const latitude = Number(body.position?.latitude);
    const longitude = Number(body.position?.longitude);
    position = Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : undefined;
    const places = await searchGooglePlaces(query, { position });
    return NextResponse.json({
      places,
      ...(previewDiagnosticsEnabled() ? { diagnostics: {
        attemptId: safeDiagnosticValue(diagnostic?.attemptId, /^[a-z0-9-]{1,64}$/i),
        source: safeDiagnosticValue(diagnostic?.source, /^(automatic|manual|retry)$/),
        manualRegionType: safeDiagnosticValue(diagnostic?.manualRegionType, /^(city|state|country|unknown)$/),
        hasPosition: Boolean(position),
        durationMs: Math.round(performance.now() - startedAt),
        routeStatus: 200,
      } } : {}),
    });
  } catch (error) {
    const failure = requestBodyParsed ? googlePlacesFailureFromUnknown(error) : new GooglePlacesRequestError("invalid_request");
    const retryAfterSeconds = failure.retryAfterSeconds;
    const routeStatus = failure.code === "invalid_request" ? 400 : failure.code === "quota" ? 429 : failure.code === "timeout" ? 504 : 502;
    return NextResponse.json({
      error: googlePlacesFailureMessage(failure.code, retryAfterSeconds),
      code: failure.code,
      ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      ...(previewDiagnosticsEnabled() ? { diagnostics: {
        attemptId: safeDiagnosticValue(diagnostic?.attemptId, /^[a-z0-9-]{1,64}$/i),
        source: safeDiagnosticValue(diagnostic?.source, /^(automatic|manual|retry)$/),
        manualRegionType: safeDiagnosticValue(diagnostic?.manualRegionType, /^(city|state|country|unknown)$/),
        hasPosition: Boolean(position),
        durationMs: Math.round(performance.now() - startedAt),
        routeStatus,
        failureCode: failure.code,
        upstreamStatus: failure.upstreamStatus,
        networkCode: failure.networkCode,
      } } : {}),
    }, { status: routeStatus });
  }
}
