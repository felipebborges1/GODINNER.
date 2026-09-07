# SDLC current state — catalog expansion workstream

- Initiative DUO NATIONAL CATALOG EXPANSION; Cuiabá/MT; duo-cuiaba-2026-09.
- Phase A/B/C complete. Phase D import COMMITTED: 22 HIGH published, Duo and real checked_at. 458 published reference. No reimport/rollback.
- Fresh read 2026-09-07T18:59:57.964Z: all 22 remain published and identical to receipt; this task made no database writes.
- City Discovery Preview ed07e41 remains available, with known Discover ordering regression. No new Preview or Production deploy in the pagination-fix task.
- Discover/Search data paths separated locally; legacy Discover selection restored; national Search paginates IDs and reuses base entities. 111 tests, TypeScript/build PASS; lint zero errors/three warnings.
- Phase D BLOCKED: complete Search can find records beyond the legacy base window, but profile routes still depend on that window. Automatic approval rejected the narrow profile fallback as outside scope; no profile edit executed.
- Fresh Production browser retry also rejected; read-only baseline recorded. New Preview smoke pending because all-PASS gate is unmet.
- See [regression check](../catalog/discover-pagination-regression-check-2026-09.md) and [baseline](../catalog/discover-production-baseline-2026-09.json).
- Next action: authorize read-only per-slug profile fallback for records outside initial catalog, then finish validation/Preview. No data writing permission requested.
- Phase E readiness NO; E/F/G NOT STARTED. São Paulo BACKLOG; Várzea Grande OUT OF SCOPE.
- Exact-ID rollback protections remain mandatory; valid batch data is preserved. HISTORICAL DATA GAP unchanged.
