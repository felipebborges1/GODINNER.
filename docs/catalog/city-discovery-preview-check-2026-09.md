# GODINNER SDLC — CUIABÁ CITY DISCOVERY PREVIEW CHECK

## Preview
URL: https://godinner-beta-cpq667jng-fbb4.vercel.app
Deployment: dpl_cZg6aaNrkFzwRRPKPQyW6Me8BMkd
Environment: Preview, READY. Project fbb4/godinner-beta. Source codex/catalog-expansion, commit ed07e41a042ad2a41deb3ea4605acca385c93080 confirmed via deployment metadata. CLI upload from clean checkout; no branch push required. No Production deploy/master change.

## Pre-deploy
Branch/HEAD/clean tree PASS; only expected implementation and SDLC artifacts since 31dbf67. 22 records preserved, no data writes required. New read timestamp was kept separate; exact authorized HEAD submitted. Previous approval blocker resolved by explicit user authorization; no remaining deployment-permission blocker.

## Search and filters
Cuiabá 22; cuiaba 22; Sushi Cuiabá 1 (Vila Sushi); Belo Horizonte 398; Nova Lima 35. Dynamic published cities PASS. City filters Cuiabá/BH/Nova Lima return 22/398/35. Cuiabá→Quilombo 3; switching to Nova Lima clears bairro and shows its four neighborhoods. URL/back/reload PASS. Clear restores 458. Duo with Cuiabá 22. Text query and city filter compose by AND; clear query when testing a city alone.

## Cuiabá sample
Açaí do Mato profile PASS, photo Google decoded 900x1200, Duo badge PASS, Sem avaliações/Ainda sem dados PASS; artificial 0.0/R$0 NO. All 22 discoverable. Final anonymous read at 2026-09-07T18:37:37.557Z confirms all 22 published rows identical to receipt, changed IDs 0. No catalog/database DML executed; ordinary Google sign-in may update provider session metadata.

## Regression
Search, profile, Duo, Google Auth PASS. Google sign-in returned to this Preview with the existing account; authenticated Feed displayed real experiences. Recommendations PASS for current account's 0/3 unlock state plus automated engine tests; no reviews created to force unlocked recommendations. Performance PASS for interactive current-size smoke, not a load benchmark.

**Discover FAIL — C-D-DISCOVER-ORDER-01 (P2, release blocker).** The implementation added id-desc ordering to the shared catalog pagination. Discover fallback without coordinates takes the first six eligible neighborhood rows, so it changes selection when created_at values tie. Existing visible first six: 68 La Pizzeria Vila da Serra; Barolio Alameda; BASILI Pizzaria | Layback Vila da Serra; Issei Experience - Cozinha Japonesa Contemporânea; KOBE BBQ; Omilía Restaurante. Preview first six: Barolio Alameda; Pausa Restaurante; Zeppe Pizza; Rullus Bistrô; Issei Experience - Cozinha Japonesa Contemporânea; Omilía Restaurante. Verified by Preview UI and side-by-side anonymous reads on the same dataset. No ranking function edit, but output changes; therefore cannot claim ranking preserved. This is a real regression in the authorized HEAD, not a Cuiabá data defect. No rollback/reimport warranted.

## Mobile and quality
375x812, 390x844, 430x932 PASS; city/bairro native selectors, sheet, chips/results and clear footer fit; no horizontal document overflow. 375 screenshot reviewed, all widths measured and controls exercised. TypeScript PASS, remote build PASS, 107 tests PASS, lint 0 errors/3 pre-existing warnings, diff check PASS. The existing tests did not cover Discover fallback order; add that regression when correcting it.

## Decision
PHASE D FINAL STATUS BLOCKED. READY FOR PHASE E NO. Phase E NOT STARTED. Preview exists for review; import remains valid. Next recommended action: narrowly correct/isolate Search catalog pagination so the existing Discover fallback selection is preserved, add an explicit regression, then publish a newly authorized Preview. Do not promote this deployment.
