# GODINNER SDLC — DISCOVER PAGINATION REGRESSION CHECK

Date: 2026-09-07. Branch: codex/catalog-expansion. Implementation based on d9a5f18.
Status: BLOCKED; local correction prepared, no new Preview generated.

## ROOT CAUSE

AppContext supplies Discover, Search, Feed, Recommendations and restaurant profiles. Before City Discovery its restaurant read was a single select(*) ordered by created_at DESC, subject to the server row cap. City Discovery replaced it with complete 500-row pagination ordered by created_at DESC, id DESC. Discover without location filters the received list to Vila da Serra / Vale do Sereno and then takes its first six; it does not rank that fallback independently. Changing the global tie-break therefore changed its subset (68 La Pizzeria became Barolio first). This was not caused by a change in the Cuiabá batch.

## SEARCH DATA PATH

Before: complete paginated rows in shared AppContext, which changed all consumers' input ordering.
After: useSearchCatalog is enabled in SearchExplorer and only while a query is active in Discover. It pages a lightweight national ID index and reuses existing AppContext entities; only missing rows are fetched in batches of at most 500. Search owns an ordered view without mutating the base array. No unnecessary second complete entity copy is retained.
Pagination: 500 IDs per page until a short page, including an extra empty page at exact multiples. Missing details are batched, not one request per restaurant. Errors, duplicate IDs and missing details fail closed rather than displaying a knowingly partial index.
Ordering: created_at DESC, id DESC. Offset pagination retains the existing concurrent-change limitation: these requests are not a database snapshot; duplicate detection does not prove absence of every possible concurrent omission.

## DISCOVER DATA PATH

Before City Discovery: single created_at DESC query, neighborhood filter, then slice(0,6).
Regressed Preview: shared complete query with an additional id DESC tie-break, then the same filter/slice.
After this patch: restore the exact original shared query; selectDiscoverFallback extracts the unchanged neighborhood/filter/slice contract. Search pagination cannot reorder this array. Active location, 5 km radius, distance ranking and geographic fallback remain unchanged.
Ordering: legacy created_at DESC, intentionally no new deterministic guarantee for equal timestamps. This is a separate nonpaginated data path, not removal of the tie-break from Search pages. Its inherited row cap remains; it does not fetch thousands of national records on idle Discover.

## BASELINE

Read-only Production database observation is recorded in discover-production-baseline-2026-09.json, with six exact IDs and names in order: 68 La Pizzeria Vila da Serra; Barolio Alameda; BASILI Pizzaria | Layback Vila da Serra; Issei Experience; KOBE BBQ; Omilía Restaurante. Names/IDs are evidence only, not product selection rules.
The fresh Production browser opening timed out and its single retry was rejected by automatic approval. There is no fresh visual Production capture in this task. Prior UI evidence and the current query observation agree. New Preview comparison: NOT EXECUTED.

## FIX AND TESTS

Search/Discover separated appropriately: YES at the list/query layer.
111 tests PASS, including 458 and exactly 1000 known records without repeated detail payload; 5001 national IDs with 1000 existing entities, 11 index requests and 9 batched detail requests; identity reuse; unchanged Discover selection before/after Search pagination; city accents, combined cuisine/city, contextual neighborhoods and Duo; errors fail closed.

Cuiabá: 22, fixture/unit PASS. cuiaba: accent normalization PASS. Sushi Cuiabá: combined terms contract PASS; new runtime smoke pending. BH / Nova Lima: city tests PASS. City filter / Neighborhood / Duo: unit PASS. Prior Preview smoke is historical evidence, not a pass for this un-deployed patch.

Discover semantic selection contract: PASS locally. Production baseline vs new Preview: PENDING. Do not claim a completed runtime regression pass.
Feed / Recommendations / Restaurant Profile / Google Auth: new Preview smoke NOT EXECUTED. Existing automated regression suite PASS; no engine or authentication changes.

## SCALE BLOCKER

RestaurantRouteClient resolves a slug only in the shared base list and calls notFound when absent. Restoring its bounded legacy input means a result found by complete Search beyond that window can lead to an unavailable profile. The 22 current Cuiabá records fit in the present catalog, but end-to-end national scale acceptance cannot be marked PASS.
A proposed narrow per-slug read for profiles was rejected by automatic approval as outside the permitted Search/Discover scope. That command did not execute; the profile file remains unchanged. No equivalent workaround was implemented elsewhere.
Required scope clarification: authorize a read-only, RLS-respecting per-slug profile fallback when an entry is absent from the initial catalog, with a regression test covering a Search result beyond the initial window. No database writes or new feature are required. Review the concrete implementation before deployment once authorized.

## PERFORMANCE

Payload regression: no additional catalog request on idle Discover by code path; Search adds a lightweight ID index and missing detail batches. Runtime performance P1/P2 NOT MEASURED on a new Preview.
N+1: NO in new catalog loader. Lazy loading preserved: YES; existing DeferredContent unchanged.
Search at 5001: loader completeness PASS in simulation, end-to-end profile navigation BLOCKED as above. No claim of full scale acceptance.

## QUALITY

TypeScript: PASS (Next build type check).
Lint: PASS, zero errors, three warnings (SearchExplorer unnecessary distance/nearby dependencies and two AppContext dataMode dependencies).
Build: PASS; 22 static pages generated.
Tests: PASS, 111/111.
git diff --check: PASS before report commit.

## PREVIEW

New URL: NONE. New deployment: NOT EXECUTED because the user's all-PASS gate is unmet.
Previous Preview only: https://godinner-beta-cpq667jng-fbb4.vercel.app, source ed07e41. It still contains the reported Discover regression; it is not this correction.

## DATABASE / ISOLATION

Additional writes: NO. Cuiabá 22 preserved: YES; fresh anonymous read at 2026-09-07T18:59:57.964Z returned 22 published, zero changed IDs against the exact import receipt. No Google matching or reimport.
Production deploy: NO. Master changed: NO. Push: NO. Other worktrees preserved.

PHASE D FINAL STATUS: BLOCKED.
READY FOR PHASE E: NO. Phase E not started.
Next action: obtain explicit authorization for the small profile fallback rejected by automatic review, then implement/test it and complete the new Preview gate and smoke. Do not promote Production.
