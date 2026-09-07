# SDLC current state — catalog expansion workstream

Scope: DUO NATIONAL CATALOG EXPANSION only; no product-roadmap or other-sprint changes.

- Pilot: Cuiabá/MT; batch duo-cuiaba-2026-09.
- Phase A PASS: original recovered manifest. Phase B PASS: 22 HIGH NEW, 4 MEDIUM, 1 LOW.
- Credential issue resolved: WRONG_VARIABLE; GOOGLE_PLACES_API_KEY server-side.
- Phase C: pre-import design and live PostgreSQL preflight complete.
- Technical readiness: READY; [data release check](../catalog/duo-cuiaba-release-check-2026-09.md).
- Phase D: BLOCKED, NOT STARTED — separate explicit production-write authorization pending.
- Phase E/F/G: NOT STARTED; Preview shares the production database.
- São Paulo BACKLOG.
- Current catalog: 438 total / 436 published / 2 pending; SQL confirms none of the 22 reserved IDs exists.
- C-SQL-01: RESOLVED by authenticated read-only pg_catalog/RLS/trigger/permission checks. No migration needed.
- C-COUNT-01: historical audit gap, non-blocking for this insert-only batch. Empório causal attribution remains unconfirmed.
- C-RELEASE-01: OPEN — production-write authorization.
- Frozen payload-array SHA-256: 3f760cb6ebe61ee6548f40ec9bf5d63a7ddad052706a90acc5d6ebfa6eb57d05.
- Next action: user reviews the technical check and decides separately whether to authorize the exact production write. No automatic Phase D start.

All 22 payloads and planned IDs are unchanged. Import, idempotency, transaction and activity-preserving exact-ID rollback controls remain mandatory. Revalidate under the future transaction before any authorized insert.
