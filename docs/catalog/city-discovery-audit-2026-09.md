# City discovery audit and implementation

Baseline 31dbf67, branch codex/catalog-expansion. Import remains 22/22, no reimport or database writes.

## Audit before implementation
Shared lib/search.ts drives both inline home search and SearchExplorer. Name, cuisine, category, neighborhood and chef participate in normalized substring matching. Address, city, state and country do not participate. City filter exists via URL YES; city textual search NO; dynamically derived city options NO; hardcoded cities/neighborhoods YES. State has no field in Restaurant schema; countryCode exists but is not a search dimension. FilterSheet hardcoded BH/Nova Lima/Vila da Serra; active labels and Search subtitle also fixed. URL uses replace, so filter steps did not form browser history.

## Authorized correction
City added to shared text. Existing substring preserved; multi-term search also allows word-prefix matches across fields, without AI or new ranking boost. Geography normalizes accents/case/spaces; multiword URL keys replace all spaces. Dynamic published-only city options reuse AppContext data; neighborhoods scoped to selected city and reset on city change. Native selects avoid thousands of chips. Filter choices and clear push URL history; typing replaces current query without one history item per character. Reload and back read current URL. No Location UX/default/ranking/recommendation changes.

Existing AppContext restaurant query was unpaged and could hit PostgREST row cap. Its replacement requests sequential 500-row pages with stable created_at/id ordering and fails closed on errors; retains RLS and existing visibility. No additional catalog copy/request just for filters. O(n) option collection plus sorting of distinct labels, memoized by data/city. Suitable for hundreds/few thousands; server-side search/facets and result virtualization remain future work for substantially larger catalogs. Concurrent writes across paginated requests are not a snapshot transaction; reload refreshes current catalog.

## Validation
107 tests PASS, including real 22-payload fixture, BH/Nova Lima/future multiword cities, accent normalization, name/cuisine/neighborhood/Duo regression and 1023-row pagination/error handling. Build and TypeScript PASS. Preview/mobile/URL acceptance to be recorded after deployment.
