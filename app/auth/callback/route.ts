import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();
  if (!code || !supabase) {
    logCallbackDiagnostic(!code ? "missing_code" : "supabase_client_unavailable");
    return NextResponse.redirect(new URL("/login?error=auth_callback", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    logCallbackDiagnostic(classifyCallbackError(error), error);
    return NextResponse.redirect(new URL("/login?error=auth_callback", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

function classifyCallbackError(error: unknown) {
  const details = getCallbackErrorDetails(error);
  if (details.name === "AuthPKCECodeVerifierMissingError" || details.code === "pkce_code_verifier_not_found") return "pkce_verifier_missing";
  if (details.code === "bad_code_verifier") return "invalid_or_expired_code";
  return "exchange_failed";
}

function getCallbackErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { name: "UnknownError", message: "Unknown callback error", status: undefined, code: undefined };
  const candidate = error as { name?: unknown; message?: unknown; status?: unknown; code?: unknown };
  return {
    name: typeof candidate.name === "string" ? candidate.name : "UnknownError",
    message: typeof candidate.message === "string" ? candidate.message.slice(0, 200) : "Unknown callback error",
    status: typeof candidate.status === "number" ? candidate.status : undefined,
    code: typeof candidate.code === "string" ? candidate.code : undefined,
  };
}

function logCallbackDiagnostic(category: string, error?: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (!error) {
    console.warn(`[auth/callback] ${category}`);
    return;
  }
  console.warn(`[auth/callback] ${category}`, getCallbackErrorDetails(error));
}
