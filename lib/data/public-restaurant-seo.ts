import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPublicRestaurantSeo, PUBLIC_RESTAURANT_SEO_FIELDS } from "@/lib/restaurant-seo";
import type { PublicRestaurantSeo } from "@/lib/restaurant-seo";

function publicClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  if (!url || !anonKey) throw new Error("Catálogo público indisponível.");
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) },
  });
}

export async function readPublicRestaurant(client: SupabaseClient<Database>, slug: string): Promise<PublicRestaurantSeo | null> {
  const { data, error } = await client.from("restaurants").select(PUBLIC_RESTAURANT_SEO_FIELDS)
    .eq("slug", slug).eq("status", "published").is("merged_into_id", null).maybeSingle();
  if (error) throw new Error("Não foi possível consultar o catálogo público.");
  return data && isPublicRestaurantSeo(data) ? data : null;
}

// Memoized only within the server request, shared by metadata and page. Never
// cache authenticated pending records globally or include them in SEO output.
export const resolveRestaurantPage = cache(async (slug: string) => {
  const restaurant = await readPublicRestaurant(publicClient(), slug);
  if (restaurant) return { kind: "public" as const, restaurant };
  const viewer = await createSupabaseServerClient();
  if (!viewer) throw new Error("Não foi possível verificar o acesso a este lugar.");
  const { data: { user }, error: authError } = await viewer.auth.getUser();
  if (!user) {
    if (authError && authError.name !== "AuthSessionMissingError") throw new Error("Não foi possível verificar a sessão.");
    return { kind: "missing" as const };
  }
  // Existing session/RLS only. Preserve an owner's/admin's private workflow
  // without exposing its name, author or address in server SEO or sitemap.
  const { data, error } = await viewer.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (error) throw new Error("Não foi possível verificar o acesso a este lugar.");
  if (data) return { kind: "private" as const };
  return { kind: "missing" as const };
});

export async function readPublicSitemapRestaurants(client: SupabaseClient<Database>) {
  const rows: Array<Pick<PublicRestaurantSeo, "slug" | "name" | "status" | "merged_into_id">> = [];
  const pageSize = 500;
  for (let start = 0; start < 50_000; start += pageSize) {
    const { data, error } = await client.from("restaurants").select("slug,name,status,merged_into_id")
      .eq("status", "published").is("merged_into_id", null).order("slug").range(start, start + pageSize - 1);
    if (error || !data) throw new Error("Não foi possível gerar o sitemap completo.");
    rows.push(...data.filter(isPublicRestaurantSeo));
    if (data.length < pageSize) return [...new Map(rows.map(row => [row.slug, row])).values()];
  }
  throw new Error("O catálogo requer divisão do sitemap antes de exceder 50 mil URLs.");
}

export function publicSitemapRestaurants() {
  return readPublicSitemapRestaurants(publicClient());
}
