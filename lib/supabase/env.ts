const publicSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const dataMode: "mock" | "supabase" = process.env.NEXT_PUBLIC_DATA_MODE === "mock"
  ? "mock"
  : publicSupabaseConfigured
    ? "supabase"
    : "mock";

export function getSupabasePublicEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

/** Server-only environment accessor. Never import this from a client module. */
export function getSupabaseEnv() {
  const publicEnv = getSupabasePublicEnv();
  return {
    ...publicEnv,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

export function hasSupabasePublicEnv() {
  const { url, anonKey } = getSupabasePublicEnv();
  return Boolean(url && anonKey);
}
