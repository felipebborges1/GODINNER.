# GODINNER SDLC — INDIVIDUAL RESTAURANT PROFILE FETCH CHECK

Date: 2026-09-07. Initiative: DUO NATIONAL CATALOG EXPANSION. Pilot: Cuiabá/MT. Batch: duo-cuiaba-2026-09.

## ROOT CAUSE

RestaurantRouteClient previously searched only AppContext.restaurants, then called notFound. National Search can contain published rows outside that bounded initial window. A valid exact Search result could therefore fail to open.

## IMPLEMENTATION

Fallback individual fetch: PASS. Cache first; a missing restaurant mounts a local profile resolver. It reads restaurants by exact slug and status=published using maybeSingle, maps the normal row and passes it to the existing RestaurantProfile. No catalog-wide refetch or insertion into AppContext.
Read-only: PASS. RLS preserved: PASS. Uses the existing browser client/session and public anonymous key, with an additional published predicate. No privileged client or policy changes. Pending/private rows cannot be obtained by this fallback; existing permitted cached-row behavior is unchanged.
Service role client-side: NO.
Identity: slug is the existing route identity. Migration 20260813000000 defines UNIQUE slug; the live release preflight recorded restaurants_slug_key. No fuzzy matching. A duplicate-result/query error stays ERROR rather than silently selecting a row.

## CACHE / STATES

Existing restaurant avoids fetch: YES, verified by route behavior test and existing-profile Preview smoke.
Missing restaurant fetched once: YES per mounted slug/viewer, including Strict Mode effect replay. Parent rerenders reuse the pending request. Explicit retry starts a new request. Unmount discards results; viewer/slug changes remount a separate resolver. No persistent cross-user cache is introduced. Revisiting after unmount may legitimately make a new read.
LOADING until the read completes; null response becomes NOT_FOUND; query failure becomes ERROR with retry. The cache-miss component is not mounted while initial data/auth loading or a global data error is unresolved.

## CUIABÁ / SCALE EVIDENCE

Search: PASS in Preview, Cuiabá=22, cuiaba=22, Sushi Cuiabá=1 (Vila Sushi). Belo Horizonte=398, Nova Lima=35. Anonymous all-catalog Search=458. After authentication the user's permitted additional row makes the unfiltered total 459; city Cuiabá remains 22. This is session visibility, not a batch write.
Outside initial load: PASS in controlled automated tests for catalog sizes 458, 1000 and 5001. The fixture omits a Cuiabá batch candidate from the initial page and verifies one exact published read. Component lifecycle tests cover cache hit/miss, loading, Strict Mode replay, temporary failure/retry, inaccessible/not-found and stale-result cleanup.
Important observation limit: all 22 actual Cuiabá rows currently fit in the deployed initial window. No natural outside-initial-load Cuiabá item exists to select in this live catalog. The deployed UI was not modified or artificially truncated, and the outside-window result is an automated boundary test, not a claim of a live cache miss.

Actual loader live read: Açaí do Mato, id 9dfa5906-33c9-5d94-9332-64606fefc9af, slug acai-do-mato-cuiaba-9dfa5906. Public anonymous client, one request, 846 JSON bytes, 662 ms observed. Identity/status PASS. See individual-profile-live-read-2026-09.json. This independently validates the actual query against the shared database without changing it.

Profile opened by Search: PASS, Açaí do Mato.
Google photo: PASS, browser image loaded 900x1200, with Google attribution.
Duo: PASS.
Address: R. João Bento, 1349 - Duque de Caxias, Cuiabá - MT, 78043-394.
Empty review state: PASS, Sem avaliações / Ainda sem notas / Ainda sem dados / no community reviews. No fake 0.0 or R$0.

## REGRESSION

Discover: PASS. The new Preview's six fallback items match the recorded Production baseline in order: 68 La Pizzeria Vila da Serra; Barolio Alameda; BASILI Pizzaria; Issei Experience; KOBE BBQ; Omilía. Rechecked after Search/filter navigation: unchanged. Uses the previously recorded database/Production baseline, not a new Production browser capture.
Existing profiles: PASS, 68 La Pizzeria opened normally.
Feed: PASS, authenticated recent experiences loaded with automatic further-loading indication. No review/list/reaction was created.
Recommendations: PASS for the existing 0/3 locked state and automated engine regression suite; no artificial activity or claim of a live unlocked-ranking test.
Google Auth: PASS, authorized Google sign-in returned to this Preview with signed-in UI.
City / contextual neighborhood / Duo: PASS. Cuiabá=22; Quilombo=3; Duo combined retains 3. URL/reload/back preserve expected filters. Clear resets the full public result set.
Mobile: filter controls fit in 375/390/430. Document width did not exceed viewport; original viewport restored.

## PERFORMANCE

N+1 global: NO. Initial payload regression from this fallback: NO; it adds no restaurant request on cache hit or Discover. A miss reads one row, never the national catalog. The existing lazy map and deferred Discover sections remain.
Discover regression: NO in baseline comparison. Search still pages its own deterministic index and reuses base entities.
Performance: PASS for bounded-query/lazy-loading contracts and functional smoke. The 662 ms is one live loader sample, not a controlled comparative Web Vitals benchmark; no quantitative P1/P2 improvement is claimed.

## QUALITY

TypeScript: PASS, Next production build type check.
Lint: PASS, zero errors; three pre-existing dependency warnings in SearchExplorer/AppContext.
Build: PASS locally and on Vercel.
Tests: PASS, 114/114.
git diff --check: PASS.

## PREVIEW

URL: https://godinner-beta-6ltmbxrtg-fbb4.vercel.app
Deployment: dpl_Dgd69ffZNVsZr1B5GVGJYPEnJuSn
Environment: Preview; CLI target=preview, READY. Vercel API target=null is the Preview representation.
Source branch: codex/catalog-expansion.
Commit: a278fd5c9fc81ea3ab196bc9d56712ef1a9c0a7c, confirmed from deployment metadata.
Includes Discover/Search fix dc7e8d4 and individual profile fix a278fd5. Documentation commits after this do not change deployed product code.

## DATABASE / ISOLATION

Catalog/application data writes by task: NO. Migration: NO. RLS changed: NO.
22 preserved: YES, fresh receipt comparison at 2026-09-07T21:45:46.432Z: 22 published, zero changed IDs.
Preview and Production still share the same database; no write was required for this validation.
Production deploy: NO. Master changed: NO. Push: NO (authorized Preview created by CLI upload). Other sprint checkouts preserved.

## DECISION

PHASE D FINAL STATUS: PASS with the explicit test-method limits above. The missing-profile scale blocker is resolved by implementation, controlled component/scale tests, actual individual read and current-catalog Preview smoke.
READY FOR PHASE E: YES. Phase E NOT STARTED; requires new authorization. No Production promotion is authorized or performed.
