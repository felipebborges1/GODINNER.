# GODINNER SDLC — CUIABÁ PHASE D REVALIDATED IMPORT CHECK

**Import: PASS, COMMITTED. Phase D closure: BLOCKED by city-search smoke C-D-SEARCH-01.** All 22 valid records remain published; no rollback, product modification or Phase E execution.

## DUO REVALIDATION
Candidates 22; confirmed 22; removed 0; identity/address changed 0. Actual confirmation UTC range 2026-09-07T17:31:35.116Z to 2026-09-07T17:32:01.067Z. All frozen public Duo URLs responded HTTP 200 with matching normalized name/address and partner availability section. HIGH retained; no new discovery or complete Google rematching. Per-record source evidence: [Duo revalidation](duo-cuiaba-duo-revalidation-2026-09.json).

## BATCH REVISION
Previous manifest preserved YES, unchanged [revision 1](duo-cuiaba-batch-2026-09.json) at 367adedf4c042f515be2d67fb263cdd493147fed. New [revision 2](duo-cuiaba-batch-2026-09-rev2.json), intent commit f412dc7. Previous checked_at null; current per-record actual UTC confirmation. Reason: Duo partnership revalidated before controlled import. New ordered payload SHA256 758c3ec070e9cd51150326a6e5128250592e3d4328542ea004537be7fede1fa5. No other payload field changed.

## PRE-WRITE
Eligible 22; Place ID conflicts 0; slug conflicts 0; UUID conflicts 0; existing/secondary matches 0; checked_at filled 22; decisions HIGH 22. Clean isolated codex/catalog-expansion checked; original Phase B/C and other worktrees preserved. Revalidated under table lock in transaction: baseline 438 total/436 published, unique indexes valid, trigger/dependency guards, exact IDs/slugs/Place IDs and conservative secondary checks. All PASS.

## IMPORT / DATABASE
Destination gzypncrwvzatzzhtehjs/public.restaurants, shared Preview/Production. Expected 22; inserted 22; single transaction COMMITTED. Insert timestamp from database 2026-09-07T17:45:43.170937+00:00. Published count 436 before, 458 after, expected 458; total 438 before/460 after; pending remains 2. Public visibility after commit and next fetch; production browser observed imported record without deploy.

## DATA QUALITY
Published 22; Duo true 22; checked_at 22; distinct valid Place IDs 22. Place ID/slug duplicates 0. Unexpected updates 0, unexpected deletes 0: all pre-existing restaurant fields compared before/after inside transaction, equal. Independent REST read also found no drift in prior snapshot fields. Correct Cuiabá/BR and MT in validated address; table has no separate state column.

All prices null; no ratings/reviews/spend invented. Reviews 0, list items 0, notifications 0, incoming merged references 0 at activity check. Media URLs/paths null in all 22, including read after media smoke. Native float8 coordinate equality passed in SQL; REST decimal serialization differed by at most 7.105427357601002e-15 degree, documented with original/read values in receipt. No material payload mismatch.

## SMOKE / MEDIA
- Restaurant search PASS: Açaí do Mato returned the imported profile.
- Restaurant profile PASS by sample Açaí do Mato; accepted address and Duo badge present.
- Empty review/spend state PASS: Sem avaliações / Ainda sem dados; no artificial 0.0 or R$0.
- Google photo PASS: 22/22 production metadata endpoints HTTP 200; three sampled media requests HTTP 307 to Google image host with private no-store; profile image decoded 900x1200. No image downloads/persistence by audit; browser displayed normal media. [Media evidence](duo-cuiaba-phase-d-media-2026-09.json).
- No-photo handling: code review confirms neutral RestaurantPhotoUnavailable fallback. No real absent-photo sample in the batch, so absent-photo runtime path was not exercised. No permanent default image persisted.
- **City search FAIL**: text Cuiabá returns 2 names containing Cuiabá, not the 22 city records. Search text omits city (lib/search.ts), and UI location choices expose only BH/Nova Lima/Vila da Serra. Existing application behavior, outside authorized product-code scope. [Smoke evidence](duo-cuiaba-phase-d-smoke-2026-09.json).

## ROLLBACK
Explicit batch IDs recorded PASS in [receipt](duo-cuiaba-phase-d-receipt-2026-09.json); activity protection available PASS in [read-only precheck](duo-cuiaba-phase-d-rollback-precheck-2026-09.sql) and prior live FK audit. This zero-activity observation is not permanent rollback permission. Recheck exact ownership/Place IDs/unchanged fields and dependency graph under parent locks immediately before any future deletion. Reviews protect comments/likes/photos/mentions and related social activity; any list, notification, merge, edit or other real relation means preserve data and MANUAL_REVIEW_REQUIRED. Never delete by time range or cascade user data. No rollback: city discovery limitation is not corrupt batch data.

## EXCLUSIONS / LIMITS
Bendito Peixaria, Choppão, Dual Patron, Villa Food and La Brasa remain excluded. La Brasa's divergent Google place was closed; the Duo restaurant's closure was not confirmed. All Várzea Grande candidates excluded. HISTORICAL DATA GAP 437→436 untouched, outside this import. No migration, master change, push, deploy, social write or product change. No OpenAI enrichment calls.

## DECISION
P0 0; P1 0; P2 1 (C-D-SEARCH-01 city discovery limitation). Import technically PASS/committed; PHASE D STATUS BLOCKED because requested city-search smoke did not fully pass. Next action: review/authorize treatment or explicit acceptance of this product limitation in a separate scope. Phase E NOT STARTED; no automatic progression.

## EXACT RECEIPT IDS
| Source ID | Restaurant | GODINNER ID | Google Place ID | Duo checked at |
|---:|---|---|---|---|
| 1 | Açaí do Mato | 9dfa5906-33c9-5d94-9332-64606fefc9af | ChIJoddasdOxnZMRG7WJXgD9cp8 | 2026-09-07T17:31:35.116+00:00 |
| 2 | BRAVUS | 324ee833-dd86-5222-bae6-3441d8db34f5 | ChIJZfCYAgyxnZMR7WvyW987cSE | 2026-09-07T17:31:35.403+00:00 |
| 4 | Bom Beef Burgers (Goiabeiras) | 4c31b41d-94c6-5bf5-aeeb-138d310c92df | ChIJB91dDmixnZMRU9l5uYBNU7E | 2026-09-07T17:31:55.179+00:00 |
| 5 | Bom Beef Burgers (Shopping 3 Américas) | a498bb22-2571-50ab-9268-601ed30d621e | ChIJxwdKHgCxnZMRW4dgweRitKc | 2026-09-07T17:31:55.487+00:00 |
| 7 | Cerveja de Garrafa | 1e592c62-f22c-5892-8a5f-299c46024c16 | ChIJ3RuYcfKxnZMRqR3FQldQ22Y | 2026-09-07T17:31:55.888+00:00 |
| 9 | Cozinha dos Fundos (Jardim das Américas) | f70333a5-48bb-5823-b655-1420b73ee403 | ChIJvy-07CewnZMRc2qQbv-XuYE | 2026-09-07T17:31:56.173+00:00 |
| 10 | Cozinha dos Fundos (Pantanal Shopping) | 9e15d9bc-a75a-59f3-b789-b314de5acafd | ChIJfdC2wVyxnZMRZUcXCtM1Fi0 | 2026-09-07T17:31:56.482+00:00 |
| 11 | Cozinha dos Fundos (Shopping Estação Cuiabá) | e550f1f3-5c49-5941-a132-8baa35a774b0 | ChIJ7ySxxPKznZMRzjlyR-Kt8tY | 2026-09-07T17:31:56.778+00:00 |
| 12 | Ditado Popular | 79129cdd-29fb-547e-b500-b192e0e38396 | ChIJsYBuoY-xnZMRn-CbJ4ulFIU | 2026-09-07T17:31:57.095+00:00 |
| 14 | Empório Serra Grande | 8fea3083-03b7-5933-b23c-c7684a542995 | ChIJH-iys_uwnZMRZIJWakzYto0 | 2026-09-07T17:31:57.393+00:00 |
| 15 | Hookerz American Bar | 62339e3f-19d0-53fb-aa0d-eb6f7bb800c9 | ChIJr4U5MoOxnZMRcrHmtTkAXAs | 2026-09-07T17:31:57.72+00:00 |
| 16 | João e o Boi | 0a750d62-c256-50b2-80aa-6b8084aadf94 | ChIJlefQkySxnZMRWyCRAKOV2ek | 2026-09-07T17:31:58.025+00:00 |
| 17 | Kopenhagen (Shopping 3 Américas) | 507cd4cb-8cc1-5d81-b8fc-38afc0814995 | ChIJ-eR99dOxnZMRKgimpXX6KE0 | 2026-09-07T17:31:58.327+00:00 |
| 19 | Maison Paris | d8c84394-2a2c-5bdf-adf2-402c00259f87 | ChIJA7n7YSuxnZMR_1SRKIXev8s | 2026-09-07T17:31:58.615+00:00 |
| 20 | Máfia Pizzaria | 2795da10-8404-51c7-b4c0-8b9bdcb305e4 | ChIJt8LAhsCxnZMRayIdR1qjjB4 | 2026-09-07T17:31:58.933+00:00 |
| 22 | Pizzarazzo Cuiabá | 3cb67d58-861b-51b2-a95b-59d5d2d08a0f | ChIJZc0hQNixnZMRcGUxRelua-A | 2026-09-07T17:31:59.231+00:00 |
| 23 | Quintal Gastrobar | f5cff15f-b957-5902-b309-418d4d828d40 | ChIJEwSFTFixnZMRDBmiow_hQ6c | 2026-09-07T17:31:59.539+00:00 |
| 24 | Ritorna Pizzaria | 218103c8-80cf-5c97-a7f4-905ec110754f | ChIJ9es77dqxnZMRzSaM2ec_cs4 | 2026-09-07T17:31:59.821+00:00 |
| 25 | Rock Amor e Pizza | c1ba3ae1-d1fd-5812-ba3e-f88f54e8d824 | ChIJ8bNzyLOxnZMRrEtQLXioU0U | 2026-09-07T17:32:00.146+00:00 |
| 26 | Seu Majó (24 de Outubro) | 04970fb3-67b7-5218-8f54-982937496099 | ChIJq6qqao-xnZMRMPhzMH_yk4g | 2026-09-07T17:32:00.466+00:00 |
| 27 | Seu Majó (Jd. das Américas) | 3abfa8f3-e146-5493-b10a-25d785bdd5d5 | ChIJf-qF5YmxnZMR7ZwO6vpLne4 | 2026-09-07T17:32:00.781+00:00 |
| 29 | Vila Sushi | 3db1cd0f-4f0e-5b8c-9c7c-a39910a0014d | ChIJBX_sM4OxnZMRvb5USgouae8 | 2026-09-07T17:32:01.067+00:00 |
