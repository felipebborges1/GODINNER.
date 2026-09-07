# Cuiabá Phase D — revised import intent

Batch duo-cuiaba-2026-09; revision 2. User authorized public Duo revalidation and import of the final confirmed set without another approval.

Previous batch remains unchanged at duo-cuiaba-batch-2026-09.json (commit 367adedf4c042f515be2d67fb263cdd493147fed), checked_at null. Revised batch: duo-cuiaba-batch-2026-09-rev2.json. Only restaurant payload change: duo_gourmet_checked_at uses each actual current confirmation timestamp. Reason: Duo partnership revalidated before controlled import.

22/22 confirmed by direct HTTP 200 at the frozen public URLs, identical normalized source name and address, partner availability section present. UTC interval 2026-09-07T17:31:35.116Z — 2026-09-07T17:32:01.067Z. None removed or changed identity; HIGH decisions preserved. No new discovery or Google matching. Response SHA256 and projected evidence recorded per source.

New payload SHA256: 758c3ec070e9cd51150326a6e5128250592e3d4328542ea004537be7fede1fa5. IDs, slugs, Place IDs, source/confidence and identities unchanged. Final intended count 22. Read-only catalog check at 17:32:23 UTC: 438 total/436 published/2 pending, zero exact conflicts or conservative secondary matches (same Cuiabá city, nearby coordinates or same normalized name).

Destination gzypncrwvzatzzhtehjs/public.restaurants, shared Preview/Production. Published records become publicly readable after commit/next fetch. Expected published after 458. SQL executor includes short bounded lock, rechecks, atomic INSERT, full existing-row equality verification and exact payload readback before commit. Coordinates compare as native float8, timestamps as timestamptz. No product changes, migration, deploy, push, Google media persistence, fabricated metrics or updates/deletes.

Rollback remains restricted to receipt IDs, exact payload ownership and no intervening activity. Check direct reviews/list_items/notifications/merged references and descendants of review/social activity before considering any deletion; preserve any activity and require manual review. HISTORICAL DATA GAP remains outside this operation. Phase E requires separate authorization.

Execution status: NOT EXECUTED at this intent commit. A separate receipt must record actual commit outcome and smoke results.
