# SDLC current state — catalog expansion workstream

- Scope DUO NATIONAL CATALOG EXPANSION, Cuiabá/MT, duo-cuiaba-2026-09.
- Phase A/B/C complete; Phase D data import COMMITTED: 22 HIGH published, Duo and real checked_at; 458 published total.
- The 22 records remain unchanged; no rollback/reimport. HISTORICAL DATA GAP untouched.
- City Discovery implemented at 7da5841; Preview source ed07e41a042ad2a41deb3ea4605acca385c93080.
- Preview READY: https://godinner-beta-cpq667jng-fbb4.vercel.app (dpl_cZg6aaNrkFzwRRPKPQyW6Me8BMkd). No Production deploy, push or master change.
- C-D-SEARCH-01 resolved in Preview: text/facet Cuiabá 22, accent/combined query/bairro/URL/mobile PASS.
- Phase D closure BLOCKED by C-D-DISCOVER-ORDER-01: id-desc pagination tie-break changes Discover fallback carousel selection. Code not changed during this deployment-only task.
- Next action: authorize narrow regression fix preserving Discover behavior, then validate a new Preview.
- [Preview check](../catalog/city-discovery-preview-check-2026-09.md) and evidence JSON record all results.
- Phase E readiness NO; Phase E/F/G NOT STARTED. São Paulo BACKLOG; Várzea Grande OUT OF SCOPE.
- Exact-ID activity-preserving rollback protections remain mandatory; current defect does not warrant deleting valid restaurants.
