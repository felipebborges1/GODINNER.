# GODINNER — Cuiabá Production Release Check (data only)

**TECHNICAL READINESS: READY. PHASE D: BLOCKED — separate user write authorization pending.**

- Batch: duo-cuiaba-2026-09; branch codex/catalog-expansion.
- Preparation baseline: 473c4542268a116eb2a574abfe3601e5e6d284b7.
- Current catalog re-read at 2026-09-07T02:09:55.769Z; SQL checks completed by 2026-09-07T02:23:25.998Z (UTC).
- [Structured evidence](duo-cuiaba-release-check-2026-09.json) and [frozen 22-row batch](duo-cuiaba-batch-2026-09.json).
- This check supersedes the historical and SQL blockers in the initial Phase C report. It grants no production-write authorization.

## Verification results

| Verification | Result | Evidence / implication |
|---|---|---|
| Isolated branch | PASS | Correct branch, clean baseline; other worktrees preserved. |
| Session | PASS | Authenticated SQL Editor, project GODINNER Beta / gzypncrwvzatzzhtehjs, current_user postgres, transaction_read_only=on. |
| UUID, slug and Place ID uniqueness | PASS | All three unique indexes exist and are valid, including the partial non-null Place ID index. |
| Constraints and schema | PASS | 13 restaurant constraints inspected, required/default fields checked, price_range and media nullable; all 22 payloads satisfy observed shape/range/name/slug/country rules. No migration needed. |
| Dependencies | PASS | Direct review, list-item, notification and self-merge FKs plus recursive dependencies inspected. CASCADE/SET NULL impact is incorporated in rollback. |
| Triggers and rules | PASS | One BEFORE UPDATE trigger only, setting new.updated_at; no INSERT/DELETE application trigger and no rewrite rule. Ordinary table. No observed mechanism that would mutate existing restaurants on these inserts. |
| Permissions / RLS | PASS | postgres is owner with SELECT/INSERT/UPDATE/DELETE and BYPASSRLS; planned SQL transaction can use this authenticated route. Normal clients remain subject to RLS. |
| Published visibility | PASS | Public SELECT policy explicitly allows published rows. Shared Production writes become visible after commit and next app fetch; no deploy needed. |
| Deduplication | PASS | Full current catalog: 438, 436 published, 2 pending; all 22 ID/slug/Place ID/secondary comparisons have zero collisions. SQL confirms 22 reserved IDs, 0 present, 0 Cuiabá rows and 0 duplicate Place IDs globally. |
| Idempotency | PASS (design supported by live schema) | Fixed UUIDs/Place IDs/payload hashes and unique indexes support exact reconciliation/no-op replay; no UPSERT or blind retries. |
| Production identity | PASS | Domain godinner-beta.vercel.app; deployment 5twFaeNBEgyL4Tr2SfcVs44eZehU Ready; source master at 5b07f8872a91878df34ad254f777a60fda4078ef, independently equal to current remote master. |
| Transaction / failure plan | PASS (design) | One transaction with brief bounded catalog-write serialization; all checks before commit; uncertain outcomes reconciled by exact IDs. No write rehearsal performed. |
| Post-write validation | PASS (plan) | Exact-ID/field receipt and pre-existing-row comparison; not executed because no write occurred. |
| Rollback protection | PASS (design supported by live dependencies) | Exact owned receipt IDs only; any activity, edit or uncertain relation stops automatic removal. |
| Separate production authorization | PENDING | This remains the only release blocker. |

## Executed read-only preflight

Seven read-only sections were run via the authenticated SQL Editor: session/indexes; constraints/recursive dependencies; triggers/RLS/grants; columns/enums/rules/authorization functions; audit settings/transaction privileges; historical normalized statement statistics; exact 22-ID absence. All used READ ONLY transactions and ROLLBACK. One metadata SELECT required an explicit char-to-text cast (SQLSTATE 42725); the corrected query passed. No data-writing statement, migration, rollback deletion or lock experiment was run.

Live unique indexes: restaurants_pkey, restaurants_slug_key, restaurants_google_place_id_unique WHERE google_place_id IS NOT NULL. The three supporting status/location indexes are also valid.

postgres owns the table and has BYPASSRLS; this is the intended privileged SQL execution route. The service role also bypasses RLS, but the future plan does not substitute 22 independent REST requests for one transaction. A normal authenticated user can only self-submit pending_review rows or update as admin; generic table grants do not bypass RLS. No restaurant DELETE policy was found for normal clients. is_admin/current_role have stable SELECT-only bodies and fixed public search_path.

The sole application trigger is restaurants_set_updated_at BEFORE UPDATE, whose body sets new.updated_at and returns new. No INSERT trigger or rewrite rule was found.

## Historical count difference

Historical published count is 437; current is 436. The delta is BH 399→398, with Nova Lima 35, Madrid 2 and Amsterdam 1 unchanged. All 291 IDs in the historical import/enrichment receipt remain published. Those receipts are not a complete list of the old 437 rows. There was no selected identity/status/provenance-column drift between the two current Phase C snapshots.

Live inspection found no catalog history/audit table by the inspected names; auth.audit_log_entries is an authentication log. Current settings are log_statement=ddl and pgaudit.log=none, which do not supply a full DML audit trail. Normalized pg_stat_statements contains historical restaurant DELETE shapes, but parameters are $1/$2 placeholders. It cannot identify the restaurant, explain the timing or prove the count delta. In PostgREST wrapper statements, the returned row count is not the deleted-row count. Current settings also do not establish past logging settings.

**The cause remains unconfirmed. Do not attribute it to Empório.** A full before-snapshot, original concrete deletion/merge receipt or equivalent change record is needed to resolve causality. No data was restored/deleted to force agreement.

**Risk decision:** historical audit gap, not a concrete blocker for this insert-only batch. There is no overlap with its 22 reserved identities, no current duplicate Place IDs and no current snapshot drift; it does not replace any prior restaurant. Reopen the issue if evidence of systemic accidental deletion, new collisions or unexpected drift emerges. This decision accepts a bounded historical limitation, not an asserted explanation.

## Exact scope requiring separate authorization

- Target: gzypncrwvzatzzhtehjs / public.restaurants, shared by Preview and Production. Reuse the verified Phase C environment evidence; no decrypted-variable query repeated.
- Insert exactly the 22 proposedPayload objects in the batch artifact, with their frozen UUIDs and Place IDs, as published. All five ineligible Cuiabá candidates and three Várzea Grande entries remain outside the write. La Brasa's Duo closure remains unconfirmed.
- Aggregate SHA-256 of the ordered payload array: 3f760cb6ebe61ee6548f40ec9bf5d63a7ddad052706a90acc5d6ebfa6eb57d05.
- Fields and values remain unchanged from Phase C: accepted identity/location, source name/unit/cuisine, BR, Duo=true, null price/media and unknown chef empty. No fabricated ratings, reviews, spend, precise source timestamp or Google photos/temporary URLs.
- No UPDATE/UPSERT to existing restaurants, migration, deploy, master change, push, Phase E/F/G or next city is authorized by this check.

## Execution controls to preserve

After a new explicit write authorization only: recheck project/baseline and payload hash; use the inspected postgres route; begin one transaction; acquire the short SHARE ROW EXCLUSIVE catalog lock with bounded timeout; rerun all-status identity/secondary dedupe and schema checks under lock; abort on drift or contention. No network discovery or user deliberation while holding the lock.

Capture existing restaurant fields within the transaction; insert one exact 22-row statement; verify 22 returned IDs and unchanged existing restaurant data before COMMIT. Persist/read back the execution receipt. A timeout around COMMIT is UNKNOWN until exact-ID and payload reconciliation; never regenerate IDs or retry blindly.

Post-commit checks: all 22 exist once with the intended fields; exclusions absent; existing rows unmodified by the transaction; no fake metadata/media. Expected totals are 460 overall and 458 published only if the baseline remains unchanged; exact-ID checks take precedence over later global count changes. Client caches may delay display; Production exposure does not wait for deploy or Preview validation.

## Rollback protected by real activity

Only receipt-proven batch IDs with matching identity/provenance are targets. Direct dependencies are reviews.restaurant_id, restaurant_list_items.restaurant_id, notifications.restaurant_id and restaurants.merged_into_id. Recursion also identifies review photos/likes/comments/mentions and profile recommendation-unlock links. The graph deliberately overapproximates paths after SET NULL; it does not imply profile deletion. The restaurant-id column scan found no additional named references, but arbitrary JSON/string references and future schema changes must still be reviewed.

Lock each exact parent before checking activity, and use additional protection for any discovered logical writer. If reviews, lists, likes/comments, notifications, merges, other relations, edits or ownership uncertainty exist: preserve the restaurant and all related data; mark MANUAL_REVIEW_REQUIRED. Automatic whole-batch deletion stops. A later explicitly reviewed safe subset may be considered; never cascade-delete user activity, use date ranges or silently reparent records.

## Final gate

**Technical READY; Production Release Check technical PASS; Phase D BLOCKED_AWAITING_SEPARATE_PRODUCTION_WRITE_AUTHORIZATION.** Revalidation at execution is mandatory, not a standing permission. No import has started.
