const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const publicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

function isLocalSupabaseUrl(value: string) {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(value).hostname);
  } catch {
    return true;
  }
}

const publicSupabaseConfigured = Boolean(publicSupabaseUrl && publicSupabaseAnonKey) && !isLocalSupabaseUrl(publicSupabaseUrl);
export const dataMode: "mock" | "supabase" = process.env.NEXT_PUBLIC_DATA_MODE === "mock" ? "mock" : "supabase";
export const supabaseConfigurationError = dataMode === "supabase" && !publicSupabaseConfigured
  ? "Supabase remoto não está configurado neste ambiente."
  : null;

export function getSupabasePublicEnv() {
  return {
    url: publicSupabaseUrl,
    anonKey: publicSupabaseAnonKey,
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
  return publicSupabaseConfigured;
}
