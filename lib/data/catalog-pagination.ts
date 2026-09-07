import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RestaurantRow } from "@/lib/supabase/database.types";

// Search owns its deterministic national index; it never reorders AppContext.
export async function loadSearchCatalog(client: SupabaseClient<Database>, knownIds: ReadonlySet<string>) {
  const ids: string[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.from("restaurants").select("id").order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + pageSize - 1);
    if (page.error) throw new Error("Não foi possível carregar o catálogo de busca.");
    ids.push(...page.data.map(row => row.id));
    if (page.data.length < pageSize) break;
  }
  if (new Set(ids).size !== ids.length) throw new Error("O catálogo mudou durante a busca. Tente novamente.");
  const missing = ids.filter(id => !knownIds.has(id));
  const extraRows: RestaurantRow[] = [];
  for (let offset = 0; offset < missing.length; offset += pageSize) {
    const chunk = missing.slice(offset, offset + pageSize);
    const page = await client.from("restaurants").select("*").in("id", chunk);
    if (page.error || page.data.length !== chunk.length) throw new Error("O catálogo mudou durante a busca. Tente novamente.");
    extraRows.push(...page.data);
  }
  return { ids, extraRows };
}

export function searchCatalogView<T extends { id: string }>(ids: readonly string[], base: readonly T[], extra: readonly T[]): T[] {
  const records = new Map(extra.map(row => [row.id, row]));
  for (const row of base) records.set(row.id, row);
  return ids.flatMap(id => { const row = records.get(id); return row ? [row] : []; });
}
