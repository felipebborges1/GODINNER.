import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";

const protectedPrefixes = ["/profile", "/review/new", "/restaurant/new", "/onboarding", "/admin"];
const protectedExactPaths = ["/lists"];

export async function proxy(request: NextRequest) {
  if (!hasSupabasePublicEnv()) return NextResponse.next();
  const response = await updateSupabaseSession(request);
  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`)) || protectedExactPaths.includes(request.nextUrl.pathname);
  if (!isProtected) return response;
  const { createServerClient } = await import("@supabase/ssr");
  const { getSupabaseEnv } = await import("@/lib/supabase/env");
  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, { cookies: { getAll: () => request.cookies.getAll(), setAll: () => undefined } });
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
