# SDLC current state — catalog expansion workstream

Scope: DUO NATIONAL CATALOG EXPANSION only.

- Pilot Cuiabá/MT; batch duo-cuiaba-2026-09.
- Phase A/B PASS; Phase C technical check complete.
- Phase D data import COMMITTED/PASS: 22 revalidated HIGH, published, Duo true, actual checked_at. Revision 2 intent f412dc7.
- Phase D closure BLOCKED: C-D-SEARCH-01, city text search finds 2/22; city filter absent. No data rollback warranted or executed.
- [Phase D report](../catalog/duo-cuiaba-phase-d-report-2026-09.md), [exact receipt](../catalog/duo-cuiaba-phase-d-receipt-2026-09.json).
- Production and Preview share database gzypncrwvzatzzhtehjs; published 436→458, total 438→460; 2 pending unchanged.
- No existing restaurant updates/deletes, no fabricated metrics or persisted Google media.
- Phase E/F/G NOT STARTED; next action: review city-discovery issue in separate authorized scope.
- São Paulo BACKLOG; Várzea Grande OUT OF SCOPE.
- HISTORICAL DATA GAP 437→436 remains nonblocking for data integrity and uninvestigated in Phase D.
- Credentials resolved previously; no broad Vercel environment read.

Rollback requires exact receipt IDs, unchanged ownership/payload, current dependency checks and protection of all real activity.

City correction at 7da5841 locally PASS: 22/22 text and city filter; BH/Nova Lima, neighborhoods, Duo, clear/back/reload and mobile 375/390/430 verified. Preview source upload blocked by automatic approval review even after project verification; Phase D stays BLOCKED, Phase E readiness NO. See [city check](../catalog/city-discovery-check-2026-09.md). No data changes.
