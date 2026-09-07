# SDLC current state — catalog expansion workstream

This file covers only DUO NATIONAL CATALOG EXPANSION; it is not the product roadmap or the state of other sprints.

- Pilot: Cuiabá/MT; batch duo-cuiaba-2026-09.
- Phase A: PASS, original manifest recovered and versioned in 5323500.
- Phase B: PASS, accepted by user; 22 HIGH NEW, 4 MEDIUM, 1 LOW.
- Credential blocker: resolved WRONG_VARIABLE; GOOGLE_PLACES_API_KEY server-side.
- Phase C: design/audit completed; [report](../catalog/duo-cuiaba-pre-import-2026-09.md).
- Phase D: BLOCKED / NOT STARTED. Live PostgreSQL preflight and count-change provenance pending; shared-Production release authorization required.
- Phase E/F/G: NOT STARTED. Preview shares the production database, so its validation cannot precede exposure of published inserts without a different environment strategy.
- São Paulo: BACKLOG.
- Current catalog observed: 438 total, 436 published, 2 pending_review at 2026-09-07T01:51:49.532Z.
- Next action: obtain read-only SQL/audit evidence for C-COUNT-01 and C-SQL-01; then request the explicit 22-row production data-write authorization.

## Decisions recorded in Phase C

- Preserve original matching; no new discovery or Google requests.
- Freeze 22 planned UUIDs, payload hashes and exclusions in the batch artifact; no row has been inserted.
- Proposed published import is a shared-Production write, not an isolated Preview test.
- Use one atomic transaction with short bounded catalog-write serialization; no blind upsert/retry.
- Rollback uses exact receipt IDs, preserves user activity and stops for manual review.
- No new migration is designed; verify live constraints first.
- Historical net -1 published in BH is proven; duplicate Empório causality remains unconfirmed.
