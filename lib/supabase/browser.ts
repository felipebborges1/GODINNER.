import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}
