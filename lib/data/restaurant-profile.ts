import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Exact identity, public status plus existing RLS; never privileged access.
export async function loadPublishedRestaurant(client: SupabaseClient<Database>, slug: string) {
  const { data, error } = await client.from("restaurants").select("*")
    .eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw new Error("Não foi possível carregar este lugar. Tente novamente.");
  return data;
}
