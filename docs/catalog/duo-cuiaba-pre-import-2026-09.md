# GODINNER SDLC — Cuiabá Phase C

## Decision

**PHASE C: completed as a design audit. PHASE D: BLOCKED.** The 22 accepted HIGH candidates remain eligible after read-only dedupe. No catalog writes were performed. Remaining gates are the unproven count-change cause, live transactional/schema verification and explicit shared-Production data-release authorization.

- Initiative: DUO NATIONAL CATALOG EXPANSION
- Batch: duo-cuiaba-2026-09
- Workspace: C:/dev/godinner-catalog-expansion
- Branch: codex/catalog-expansion; initial checkout clean.
- Phase B input commit: 5323500759460e8e30e8d7145933505fada19929
- Phase B JSON SHA-256: b96d0a4571e0740a93e7cc80d843da7b26767868c487f7272a91cee6426bfa11
- Revalidation timestamp (UTC): 2026-09-07T01:51:49.532Z
- Baseline product commit: 5b07f8872a91878df34ad254f777a60fda4078ef
- No discovery or matching repeated. Google calls: 0.

## INPUT and OUTPUT

Input is the committed Phase B ledger, not an oral summary. Outputs are this pre-import report, [reserved batch and payloads](duo-cuiaba-batch-2026-09.json), [read-only snapshot and environment evidence](duo-cuiaba-phase-c-audit-2026-09.json), and [read-only SQL preflight](duo-cuiaba-phase-c-preflight-2026-09.sql), which is prepared but not run. The original Phase A and Phase B files are unchanged.

## Final candidates — 22

Address below is the accepted Google formatted address. Display names retain the unit qualifiers from Duo. Each proposed UUID is reserved only: actualGodinnerId remains null until an authorized commit is verified. All 22 have photo metadata in Phase B, not downloaded photos.

| Source ID | Name | Address | Place ID | HIGH evidence | Photo | Reserved GODINNER ID |
|---:|---|---|---|---|---|---|
| 1 | Açaí do Mato | R. João Bento, 1349 - Duque de Caxias, Cuiabá - MT, 78043-394 | ChIJoddasdOxnZMRG7WJXgD9cp8 | Nome, Rua João Bento 1349 e Duque de Caxias coincidem. | YES | 9dfa5906-33c9-5d94-9332-64606fefc9af |
| 2 | BRAVUS | Av. Guilherme Hans, 13 - Jardim Tropical, Cuiabá - MT, 78065-170 | ChIJZfCYAgyxnZMR7WvyW987cSE | Bravus Hamburgueria Ltda preserva o nome distintivo BRAVUS; Av. Guilherme Hans 13 e Jardim Tropical coincidem. | YES | 324ee833-dd86-5222-bae6-3441d8db34f5 |
| 4 | Bom Beef Burgers (Goiabeiras) | Av. Jose Monteiro de Figueiredo, 848 - Duque de Caxias, Cuiabá - MT, 78043-300 | ChIJB91dDmixnZMRU9l5uYBNU7E | Nome da unidade Goiabeiras e Av. José Monteiro de Figueiredo 848 / Duque de Caxias coincidem. | YES | 4c31b41d-94c6-5bf5-aeeb-138d310c92df |
| 5 | Bom Beef Burgers (Shopping 3 Américas) | Av. Brasília, 178 - Jardim das Américas, Cuiabá - MT, 78060-601 | ChIJxwdKHgCxnZMRW4dgweRitKc | Google denomina a unidade Jardim das Américas; mesma marca e endereço exato Av. Brasília 178 / Jardim das Américas sustentam a identidade apesar do rótulo Shopping 3 Américas no Duo. | YES | a498bb22-2571-50ab-9268-601ed30d621e |
| 7 | Cerveja de Garrafa | R. Sen. Vilas Bôas, 20 - Popular, Cuiabá - MT, 78045-430 | ChIJ3RuYcfKxnZMRqR3FQldQ22Y | Nome distintivo e Rua Sen. Vilas Bôas 20 / Popular coincidem. | YES | 1e592c62-f22c-5892-8a5f-299c46024c16 |
| 9 | Cozinha dos Fundos (Jardim das Américas) | Av. Haiti, 500 - Jardim das Américas, Cuiabá - MT, 78060-618 | ChIJvy-07CewnZMRc2qQbv-XuYE | Marca e Av. Haiti 500 / Jardim das Américas coincidem; endereço distingue a unidade. | YES | f70333a5-48bb-5823-b655-1420b73ee403 |
| 10 | Cozinha dos Fundos (Pantanal Shopping) | Av. Historiador Rubens de Mendonça, 3300 - Jardim Aclimacao, Cuiabá - MT, 78020-250 | ChIJfdC2wVyxnZMRZUcXCtM1Fi0 | Marca, Pantanal Shopping e Av. Historiador Rubens de Mendonça 3300 / Jardim Aclimação coincidem. | YES | 9e15d9bc-a75a-59f3-b789-b314de5acafd |
| 11 | Cozinha dos Fundos (Shopping Estação Cuiabá) | SHOPPING ESTAÇÃO CUIABA - Av. Miguel Sutil, 9300 - Duque de Caxias, Cuiabá - MT, 78040-365 | ChIJ7ySxxPKznZMRzjlyR-Kt8tY | Marca e endereço Av. Miguel Sutil 9300 / Duque de Caxias coincidem; Google explicita Shopping Estação Cuiabá. | YES | e550f1f3-5c49-5941-a132-8baa35a774b0 |
| 12 | Ditado Popular | R. Sen. Vilas Bôas, 89 - Popular, Cuiabá - MT, 78045-360 | ChIJsYBuoY-xnZMRn-CbJ4ulFIU | Nome e Rua Senador Vilas Bôas 89 / Popular coincidem; abreviações normalizadas. | YES | 79129cdd-29fb-547e-b500-b192e0e38396 |
| 14 | Empório Serra Grande | R. Dep Milton De Figueiredo, 84 - Morada do Ouro, Cuiabá - MT, 78075-000 | ChIJH-iys_uwnZMRZIJWakzYto0 | Nome distintivo Serra Grande preservado; Rua Dep. Milton de Figueiredo 84 / Morada do Ouro coincide. Variação Empório versus Bar e Restaurante registrada. | YES | 8fea3083-03b7-5933-b23c-c7684a542995 |
| 15 | Hookerz American Bar | Av. Sen. Filinto Müller, 1398 - Quilombo, Cuiabá - MT, 78043-500 | ChIJr4U5MoOxnZMRcrHmtTkAXAs | Nome distintivo Hookerz preservado; Av. Sen. Filinto Müller 1398 / Quilombo coincide. Variação American Bar versus Beer Club registrada. | YES | 62339e3f-19d0-53fb-aa0d-eb6f7bb800c9 |
| 16 | João e o Boi | Av. São Sebastião, 2623 - Popular, Cuiabá - MT, 78045-400 | ChIJlefQkySxnZMRWyCRAKOV2ek | Nome e Av. São Sebastião 2623 / Popular coincidem. | YES | 0a750d62-c256-50b2-80aa-6b8084aadf94 |
| 17 | Kopenhagen (Shopping 3 Américas) | Kopenhagen Shopping 3 Américas - Av. Brasília, 146 - Lj 218 - Jardim das Américas, Cuiabá - MT, 78060-601 | ChIJ-eR99dOxnZMRKgimpXX6KE0 | Marca, Shopping 3 Américas e Av. Brasília 146 / Jardim das Américas coincidem; Google adiciona loja 218. | YES | 507cd4cb-8cc1-5d81-b8fc-38afc0814995 |
| 19 | Maison Paris | Shopping Goiabeiras - Av. Jose Monteiro de Figueiredo, 500 - Duque de Caxias - Goiabeiras, Cuiabá - MT, 78043-900 | ChIJA7n7YSuxnZMR_1SRKIXev8s | Nome exato e endereço formatado Google Av. José Monteiro de Figueiredo 500 / Duque de Caxias coincidem; Google explicita Shopping Goiabeiras. Número sustentado pelo endereço formatado, não por street_number isolado. | YES | d8c84394-2a2c-5bdf-adf2-402c00259f87 |
| 20 | Máfia Pizzaria | Av. Cel. Escolástico, N° 703 - Bandeirantes, Cuiabá - MT, 78010-200 | ChIJt8LAhsCxnZMRayIdR1qjjB4 | Nome distintivo Máfia Pizzaria e Av. Cel. Escolástico 703 / Bandeirantes coincidem; diacríticos e prefixo N° normalizados. | YES | 2795da10-8404-51c7-b4c0-8b9bdcb305e4 |
| 22 | Pizzarazzo Cuiabá | Av. Presidente Marques, 731 - Quilombo, Cuiabá - MT, 78045-175 | ChIJZc0hQNixnZMRcGUxRelua-A | Nome e Av. Presidente Marques 731 / Quilombo coincidem; sufixo Delivery e Retirada não altera a identidade. | YES | 3cb67d58-861b-51b2-a95b-59d5d2d08a0f |
| 23 | Quintal Gastrobar | R. do Flamengo, 287 - Jardim Guanabara, Cuiabá - MT, 78010-675 | ChIJEwSFTFixnZMRDBmiow_hQ6c | Nome e Rua do Flamengo 287 / Jardim Guanabara coincidem. | YES | f5cff15f-b957-5902-b309-418d4d828d40 |
| 24 | Ritorna Pizzaria | Av. Sen. Filinto Müller, 220 - Goiabeiras, Cuiabá - MT, 78045-410 | ChIJ9es77dqxnZMRzSaM2ec_cs4 | Nome distintivo Ritorna e Av. Sen. Filinto Müller 220 / Goiabeiras coincidem. | YES | 218103c8-80cf-5c97-a7f4-905ec110754f |
| 25 | Rock Amor e Pizza | R. W, 413 - Jardim Aclimacao, Cuiabá - MT, 78050-244 | ChIJ8bNzyLOxnZMRrEtQLXioU0U | Nome e Rua W 413 / Jardim Aclimação coincidem. | YES | c1ba3ae1-d1fd-5812-ba3e-f88f54e8d824 |
| 26 | Seu Majó (24 de Outubro) | Rua 24 de Outubro, 602 - Centro Norte, Cuiabá - MT, 78005-330 | ChIJq6qqao-xnZMRMPhzMH_yk4g | Marca, unidade 24 de Outubro e Rua 24 de Outubro 602 / Centro Norte coincidem. | YES | 04970fb3-67b7-5218-8f54-982937496099 |
| 27 | Seu Majó (Jd. das Américas) | Av. Brasília, 390 - Jardim das Américas, Cuiabá - MT, 78060-601 | ChIJf-qF5YmxnZMR7ZwO6vpLne4 | Marca, unidade Jardim das Américas e Av. Brasília 390 / Jardim das Américas coincidem. | YES | 3abfa8f3-e146-5493-b10a-25d785bdd5d5 |
| 29 | Vila Sushi | Av. Sen. Filinto Müller, 1385 - Quilombo, Cuiabá - MT, 78043-400 | ChIJBX_sM4OxnZMRvb5USgouae8 | Nome e Av. Sen. Filinto Müller 1385 / Quilombo coincidem. | YES | 3db1cd0f-4f0e-5b8c-9c7c-a39910a0014d |

## Exclusions

| Source ID | Candidate | Confidence | Reason |
|---:|---|---|---|
| 3 | Bendito Peixaria Cuiabá | MEDIUM | Nome semelhante, mas Google aponta Av. Archimedes Pereira Lima / Jardim Itália; Duo aponta Rua das Laranjeiras / Jardim Guanabara sem número. Possível mudança ou outra unidade; revisão obrigatória. |
| 8 | Choppão | MEDIUM | Restaurante Choppão tem praça e número 44 coincidentes, mas bairro Google Goiabeiras diverge do Duo Quilombo. Outro resultado é a praça pública, número 366, descartada. Divergência de bairro não resolvida: MEDIUM. |
| 13 | Dual Patron Pizzaria | MEDIUM | Nome exato, mas Google aponta Av. das Palmeiras 11 / Jardim Imperial; Duo Rua Dr. Luís Felipe Sabóia Ribeiro 641 / Boa Esperança. Revisão obrigatória. |
| 18 | La Brasa Burger | LOW | Duas buscas retornam somente o Place nomeado cuiaba, Rua Brigadeiro Eduardo Gomes 01, CLOSED_PERMANENTLY. Nome e número não confirmam La Brasa Burger 362. LOW; Place rejeitado. Não concluir que o restaurante Duo fechou. |
| 30 | Villa Food | MEDIUM | Vila food é nome compatível com Villa Food e mesma avenida/bairro, mas ambas fontes não têm número. Google está muito próximo de Vila Sushi; sem coordenadas Duo ou evidência adicional de unidade, MEDIUM. |

Várzea Grande IDs 6, 21, 28 remain OUT_OF_SCOPE. La Brasa: the Google result is CLOSED_PERMANENTLY with a divergent identity; closure of the Duo restaurant is NOT confirmed. No excluded candidate appears in the payload set.

## Destination and user visibility

**Destination: Supabase gzypncrwvzatzzhtehjs, public.restaurants, shared between Vercel Preview and Production.** Production domain is https://godinner-beta.vercel.app. The Vercel overview shows deployment 5twFaeNBEgyL4Tr2SfcVs44eZehU, URL godinner-beta-q5ji0yw2h-fbb4.vercel.app, Ready, source master at 5b07f8872a91878df34ad254f777a60fda4078ef. This was checked independently of local master.

The single NEXT_PUBLIC_SUPABASE_URL entry is scoped to Production and Preview. Its private stored value was not exposed. The public production bundle confirms https://gzypncrwvzatzzhtehjs.supabase.co, matching the database read. Protected Preview redirects to Vercel login without authentication; no protected bundle was bypassed. This confirms shared project configuration, not the runtime configuration of every historical deployment.

**Proposed status: published.** Data becomes eligible for public reads at database COMMIT; users see it on the next fetch/refresh, subject to existing client caches. No push, merge or deploy is required for this exposure. A deploy rollback does not undo database inserts. Preview validation after this write would already be inspecting production data. Therefore Phase D needs a Production Release Check and explicit authorization for this exact shared database, not an assumed beta sandbox.

A pending_review staging alternative is not proposed here as equivalent to an isolated Preview: the database is still shared, administrators can see it, and pending-state permissions need review. If true isolated Preview is required, provide a separate database and revalidate there in a separately authorized plan.

## Persisted fields and provenance

| Fields | Proposed value / rule |
|---|---|
| id | Preallocated UUIDv5 in batch JSON; never regenerate on retry. |
| slug | Normalized source name + cuiaba + UUID prefix; collision checked. |
| name | Original Duo name with unit qualifier. |
| address | Accepted Google formatted address from Phase B. |
| city, neighborhood | Cuiabá and original corroborated Duo neighborhood. |
| latitude, longitude | Accepted Google coordinates, with field-level provenance in Phase B. |
| category | bar when source/Google type establishes it; otherwise restaurant. |
| cuisines | Original Duo cuisine as a one-element array; no extra cuisine inferred. |
| country_code | BR. |
| google_place_id | Exact accepted Phase B Place ID. |
| accepts_duo_gourmet | true, based on original discovery manifest. |
| duo_gourmet_checked_at | null: Phase A preserves a discovery date but not a precise retrieval instant. Keep 2026-09-06 as date-only provenance in the batch; do not fabricate an exact timestamp or pretend re-verification now. |
| status | published, only after the shared-Production release gate. |
| price_range | null. |
| chef | Empty string for the existing NOT NULL field, representing unknown, not an invented name. |
| cover_photo_url, cover_photo_path | null. Photo availability stays in the audit only; existing Place-ID media flow handles rendering. |
| created_at, updated_at | Database defaults on actual insert. |
| Other optional fields | Omitted / existing null defaults; no fabricated website, phone, moderation actor or time. |

No ratings, reviews, spend, likes, lists, Google images, temporary URLs or photo resource names are persisted. The source date, source URL, batch ID, evidence, reserved UUID, eventual actual UUID and payload SHA-256 are tracked in the versioned batch/receipt, not new restaurant columns.

**Migration: no new migration is needed by the proposed data shape.** Live REST metadata confirms all payload columns exist and price_range is nullable. The repository already defines a partial unique Google Place ID index and UUID/slug keys. REST metadata cannot prove live index validity; the read-only pg_catalog preflight must close that gate. If actual schema differs, stop and request a separate migration plan rather than silently changing schema.

## Dedupe and idempotency

Read all 438 rows with service-role visibility, exact count, pagination and no status/city/legacy filters: published=436, pending_review=2. No inactive enum exists in the observed REST schema; no other statuses were present. Legacy rows without Place ID were included.

For all 22: no existing Place ID, no secondary identity match, no nearby catalog row within 1 km, no same-city name candidate, and no reserved ID/slug conflict. Compare all statuses again immediately before the transaction. A new collision removes that candidate from eligibility and blocks execution of the frozen 22-row payload until a revised batch is reviewed. Never merge by name and never overwrite an existing catalog row.

Within the batch, all 22 Place IDs and UUIDs are distinct. Bom Beef has 2 units, Cozinha dos Fundos 3, Seu Majó 2. Their accepted addresses and Place IDs stay separate.

UUIDv5 uses the standard URL namespace and the string godinner:duo-cuiaba-2026-09:<Place ID>. A durable pre-write ledger fixes those IDs and payload hashes. Before any retry: all 22 absent means potentially safe to execute after revalidation; all 22 present with exact payload and verified receipt means NO-OP; same Place ID under a different UUID, mismatched payload or a subset present means STOP_AND_RECONCILE. Do not use UPSERT, conflict-update, ignore-duplicates or a blind retry.

## Proposed import transaction — not executed

1. Obtain explicit authorization for this batch, final receipt hash, target database and published status; complete Production Release Check using the then-current baseline.
2. Close all blockers below. Secure a supported authenticated SQL connection with credentials used only in memory. Do not add an ad-hoc SQL RPC or use an existing merge/import routine.
3. Validate the preallocated ledger and all required fields against the live schema. Save an execution intent before submitting any write.
4. Begin one transaction. Acquire a brief SHARE ROW EXCLUSIVE lock on public.restaurants with a bounded lock timeout; if competing writes prevent acquisition, abort and reschedule. This creates a short explicit catalog-write serialization window; other read traffic continues. Do not hold the lock during network discovery or user deliberation.
5. While holding the lock, repeat exact and secondary dedupe against all current rows, ID/slug checks, the live unique-index gate, schema/dependency/trigger checks and expected payload count. Abort on any change requiring review.
6. Execute one insert statement for the exact 22 payloads, with RETURNING IDs and persisted fields. No updates to pre-existing rows. Verify exactly 22 returned rows and field equality before COMMIT.
7. Record the committed receipt with batch ID, intended and actual IDs, payload hash, execution time, target and before/after counts. Read back every exact ID. This receipt must exist before declaring success.

The design uses a transaction to prevent partial visibility. It requires an executor that can keep checks and INSERT in the same SQL session; 22 independent REST writes are not an equivalent implementation. No transaction or executable writer has been run in Phase C.

## Partial failure and uncertain outcome

- Any statement/check/lock failure before COMMIT aborts the whole transaction; expected committed inserts = 0. Do not attempt automatic compensation by deleting records.
- Timeout/disconnect around COMMIT means UNKNOWN outcome, not failure. Reconnect read-only and reconcile the 22 reserved IDs, Place IDs and payloads before any retry.
- Receipt filesystem failure after COMMIT also means reconciliation required. Recover from the durable intent and exact IDs; never generate new IDs.
- A subset or drifted payload triggers STOP, preserves existing records and requires investigation. It may indicate unexpected prior execution or concurrent intervention.
- If post-commit validation fails, stop further writes and use the separately reviewed exact-ID rollback assessment below.

## Exact-ID rollback and activity protection

The rollback target is the intersection of the frozen 22 reserved IDs with the verified execution receipt, matching Place ID and provenance. Planned IDs alone do not authorize deleting a row that happens to exist. No date-range predicate, whole-city deletion or rollback of unrelated records is allowed.

Before rollback, use the live FK inventory recursively, including private schemas and logical references without FKs. Known direct references are reviews.restaurant_id, restaurant_list_items.restaurant_id, notifications.restaurant_id and restaurants.merged_into_id. Indirect data includes review_photos, review_likes, review_comments, comment mentions/replies, notification relations and profile recommendation-unlock references. Relationships learned from the live schema are mandatory additions; no hard-coded list is assumed complete.

In one rollback transaction, lock each exact parent row FOR UPDATE before the activity checks so FK-backed new child inserts cannot race the checks. Acquire any further locks required by discovered non-FK writers. Use short timeouts and abort on contention, ambiguous ownership, schema drift or unexpected triggers.

Classify each batch row:

- **SAFE_TO_REMOVE:** receipt ownership proven, current data still matches the imported record, no review/list/like/social/notification/merge/logical relation, and no meaningful post-import edit. Only those exact rows may be candidates for a separately authorized DELETE after repeating the checks under lock.
- **MANUAL_REVIEW_REQUIRED:** any real activity, edits, uncertain provenance or unknown dependency. Preserve the restaurant and all relationships. Do not cascade-delete, auto-merge, reparent reviews or automatically change status. A later specific correction may retain/correct the record or merge it only under a separately reviewed relationship-preserving procedure.

If any row needs manual review, automatic whole-batch rollback stops. A partial rollback of safe rows needs an explicit reviewed ID subset; its receipt must record removed IDs and retained IDs with reasons. The desired 22-row removal is never forced at the expense of user activity.

## Reconciliation: 437 historical versus 436 current

Historical receipt at 2026-09-03T21:00:31.424Z: published=437; BH=399, Nova Lima=35, Madrid=2, Amsterdam=1. Current published=436; BH=398, Nova Lima=35, Madrid=2, Amsterdam=1. The two pending rows explain why total=438, not the historical published decrease.

All 50 enriched IDs and 241 inserted IDs in the historical receipt still exist and are published: missing=0, demoted=0. These 291 IDs are not the complete historical 437-row catalog. Current Empório-named records include Empório Paraíso (Nova Lima), Dona Carola and CASA BAR; that alone does not identify a deletion.

**Conclusion: delta -1 in BH is verified; attribution to removal of a duplicate Empório is UNCONFIRMED.** No complete before-snapshot or audited delete/merge result with the original duplicate ID was found in the versioned artifacts inspected. Supabase dashboard access currently requires login, so database change/audit logs were not inspected. Obtain the original ID and executed deletion/merge receipt or a database audit/backup comparison before attributing causality. Do not recreate or delete an Empório to make the counts agree.

## Before/after validation checklist

Before: verify correct worktree and commit; target project; current Production domain/deployment/commit/source branch and remote master separately; close count-change and SQL gates; verify backup/recovery availability; acquire exact authorization; validate all 22 payload hashes; recheck all-status dedupe and schema; verify no excluded IDs; record baseline counts and execution intent.

After authorized COMMIT: all 22 exact IDs exist once with matching Place IDs and fields, no excluded candidate inserted, no pre-existing restaurant modified, no fake ratings/reviews/prices/media, receipt complete. If baseline remains unchanged at lock acquisition, total should rise 438→460 and published 436→458; those are expectations, not execution results. Use exact-ID checks when concurrent legitimate writes change global counts. User-created activity after commit is preserved, not treated as a test artifact. Validate existing photo fallback behavior without persisting downloaded photos. Preview validation cannot claim to precede Production data exposure on this shared database.

## STOP GATES, risks and pending actions

- C-COUNT-01: establish the cause/ID behind the net -1 published change; currently unconfirmed.
- C-SQL-01: read-only pg_catalog preflight, full dependencies/triggers/RLS, unique-index validity and usable single-session transaction route; currently not verified. No migration is to be inferred or applied automatically.
- C-RELEASE-01: explicit Production data-release approval before published inserts in the shared database. No code deployment is planned.
- Brief catalog write lock requires coordination with parallel catalog writers; never block other work indefinitely.
- Dedupe and photo/status evidence are time-sensitive. Phase C made no new Google calls; if the accepted Phase B evidence becomes stale, stop for a separately authorized refresh.

## NEXT ACTION and concrete authorization scope

First resolve C-COUNT-01 and C-SQL-01 through read-only evidence. Then request authorization to insert exactly the 22 frozen payloads as published into gzypncrwvzatzzhtehjs/public.restaurants, with immediate Production visibility, one atomic transaction, no update to existing rows, exact-ID receipt and the activity-preserving rollback design above. The authorization must acknowledge the shared database and pass Production Release Check.

**Do not begin Phase D now.** No database writes, migrations, deploys, master changes or push occurred in Phase C.
