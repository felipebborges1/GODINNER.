import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RestaurantRow } from "@/lib/supabase/database.types";

// Reuse the existing catalog request; do not silently truncate at PostgREST's row cap.
export async function loadVisibleCatalog(client: SupabaseClient<Database>) {
  const data: RestaurantRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.from("restaurants").select("*").order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + pageSize - 1);
    if (page.error) return { data: null, error: page.error };
    data.push(...page.data);
    if (page.data.length < pageSize) return { data, error: null };
  }
}
