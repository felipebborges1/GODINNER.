# Duo Gourmet — Cuiabá Google Matching Audit

- Initiative: DUO NATIONAL CATALOG EXPANSION
- Batch: duo-cuiaba-2026-09
- Phase: B — Google Matching Audit
- Status: **PASS**
- Audit timestamps (UTC): 2026-09-07T01:41:55.886Z to 2026-09-07T01:43:06.696Z
- Assessment timestamp (UTC): 2026-09-07T01:46:13.371Z
- Branch: codex/catalog-expansion
- Baseline: 5b07f8872a91878df34ad254f777a60fda4078ef
- Input: [original Phase A manifest](duo-cuiaba-discovery-2026-09.md), recovered byte-for-byte from C:/dev/godinner-web/docs/catalog.
- Manifest SHA-256: c5862f22b87df19c4df649676b8b9a2340f84c7ec6960978560c49adbb669ce5
- Evidence and catalog snapshot: [Phase B JSON](duo-cuiaba-google-matching-2026-09.json). No secrets, photo bytes, photo resource names, or temporary photo URLs are stored.

## INPUT

Exactly 27 IN_SCOPE candidates from the recovered original manifest. Source IDs 6, 21, 28 (Várzea Grande) remain OUT_OF_SCOPE and were not queried. No new discovery was performed.

## Credential gate and historical attempt

Root cause WRONG_VARIABLE: the earlier attempt used GOOGLE_MAPS_API_KEY instead of GOOGLE_PLACES_API_KEY. The original recovered Phase B file records the controlled HTTP 200 gate. This retry uses only GOOGLE_PLACES_API_KEY for server-side Places requests. NEXT_PUBLIC_GOOGLE_MAPS_API_KEY was not used. The prior 27 unavailable responses were not real NO_MATCH and are excluded from all current counts.

## Method and reliability

One Text Search per source candidate using name and source address; one additional query for La Brasa to test its divergent result. Search returned identity, address components, coordinates, business status, types and photo metadata. No Place Details or photo download was necessary. All returned alternatives were examined; none had a remaining result page. HIGH requires distinct name/brand and corroborating street/number/neighborhood/city, plus plausible Google coordinates and operational status. Coordinates are not independently corroborated by Duo because Phase A contains none. Photo availability is metadata only, not a guarantee of future delivery or identity.

MEDIUM: source IDs 3, 8, 13, 30. LOW: ID 18. These are isolated evidence limitations, not systemic matcher failure. Matching reliability HIGH applies to the 22 safe HIGH decisions; it does not promote the other five candidates.

## OUTPUT

| Matching | Count |
|---|---:|
| HIGH | 22 |
| MEDIUM | 4 |
| LOW | 1 |
| NO_MATCH | 0 |

| Proposed Google Place status | Count |
|---|---:|
| OPERATIONAL | 26 |
| CLOSED_TEMPORARILY | 0 |
| CLOSED_PERMANENTLY | 1 |
| UNKNOWN | 0 |

**Status caveat:** the closed Place returned for La Brasa has unconfirmed identity. Its closure is not evidence that the Duo restaurant closed. That candidate is LOW and its proposed Place is rejected under CLOSED. Decision counts are mutually exclusive: CLOSED takes precedence over REJECT_LOW, hence LOW=1 but REJECT_LOW=0.

HIGH with photo: 22. HIGH without photo: 0.

## Candidate ledger

| Duo ID | Original name | Google name | Proposed Place ID | Google address | Latitude / longitude | Business status | Photo metadata | Confidence | Dedupe | Decision | Identity evidence |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Açaí do Mato | Açaí do Mato | ChIJoddasdOxnZMRG7WJXgD9cp8 | R. João Bento, 1349 - Duque de Caxias, Cuiabá - MT, 78043-394 | -15.585405199999999, -56.1096262 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome, Rua João Bento 1349 e Duque de Caxias coincidem. |
| 2 | BRAVUS | Bravus Hamburgueria Ltda | ChIJZfCYAgyxnZMR7WvyW987cSE | Av. Guilherme Hans, 13 - Jardim Tropical, Cuiabá - MT, 78065-170 | -15.613553800000002, -56.0822735 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Bravus Hamburgueria Ltda preserva o nome distintivo BRAVUS; Av. Guilherme Hans 13 e Jardim Tropical coincidem. |
| 3 | Bendito Peixaria Cuiabá | Bendito Peixaria - Restaurante | ChIJo4RBSgCvnZMR1LFDRDfR2kQ | Av. Archimedes Pereira Lima - Jardim Itália, Cuiabá - MT, 78068-335 | -15.6147678, -56.047483799999995 | OPERATIONAL | YES | MEDIUM | NEW | MANUAL_REVIEW_MEDIUM | Nome semelhante, mas Google aponta Av. Archimedes Pereira Lima / Jardim Itália; Duo aponta Rua das Laranjeiras / Jardim Guanabara sem número. Possível mudança ou outra unidade; revisão obrigatória. |
| 4 | Bom Beef Burgers (Goiabeiras) | Bom Beef Burgers Goiabeiras | ChIJB91dDmixnZMRU9l5uYBNU7E | Av. Jose Monteiro de Figueiredo, 848 - Duque de Caxias, Cuiabá - MT, 78043-300 | -15.590141899999997, -56.1078212 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome da unidade Goiabeiras e Av. José Monteiro de Figueiredo 848 / Duque de Caxias coincidem. |
| 5 | Bom Beef Burgers (Shopping 3 Américas) | Bom Beef Burgers Jardim das Américas | ChIJxwdKHgCxnZMRW4dgweRitKc | Av. Brasília, 178 - Jardim das Américas, Cuiabá - MT, 78060-601 | -15.6113992, -56.073512400000006 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Google denomina a unidade Jardim das Américas; mesma marca e endereço exato Av. Brasília 178 / Jardim das Américas sustentam a identidade apesar do rótulo Shopping 3 Américas no Duo. |
| 7 | Cerveja de Garrafa | Bar Cerveja de Garrafa | ChIJ3RuYcfKxnZMRqR3FQldQ22Y | R. Sen. Vilas Bôas, 20 - Popular, Cuiabá - MT, 78045-430 | -15.5933122, -56.105674799999996 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome distintivo e Rua Sen. Vilas Bôas 20 / Popular coincidem. |
| 8 | Choppão | Restaurante Choppão / Delivery • Desde 1974 • | ChIJl0t5pIWxnZMRNsCsjobheRw | Praça 8 de Abril, 44 - Goiabeiras, Cuiabá - MT, 78000-000 | -15.5906644, -56.106352400000006 | OPERATIONAL | YES | MEDIUM | NEW | MANUAL_REVIEW_MEDIUM | Restaurante Choppão tem praça e número 44 coincidentes, mas bairro Google Goiabeiras diverge do Duo Quilombo. Outro resultado é a praça pública, número 366, descartada. Divergência de bairro não resolvida: MEDIUM. |
| 9 | Cozinha dos Fundos (Jardim das Américas) | Cozinha Dos Fundos | ChIJvy-07CewnZMRc2qQbv-XuYE | Av. Haiti, 500 - Jardim das Américas, Cuiabá - MT, 78060-618 | -15.608046300000002, -56.0724362 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Marca e Av. Haiti 500 / Jardim das Américas coincidem; endereço distingue a unidade. |
| 10 | Cozinha dos Fundos (Pantanal Shopping) | Cozinha dos Fundos - Pantanal Shopping | ChIJfdC2wVyxnZMRZUcXCtM1Fi0 | Av. Historiador Rubens de Mendonça, 3300 - Jardim Aclimacao, Cuiabá - MT, 78020-250 | -15.5759171, -56.072657 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Marca, Pantanal Shopping e Av. Historiador Rubens de Mendonça 3300 / Jardim Aclimação coincidem. |
| 11 | Cozinha dos Fundos (Shopping Estação Cuiabá) | Cozinha dos Fundos - Taste lab | ChIJ7ySxxPKznZMRzjlyR-Kt8tY | SHOPPING ESTAÇÃO CUIABA - Av. Miguel Sutil, 9300 - Duque de Caxias, Cuiabá - MT, 78040-365 | -15.590144700000002, -56.1206767 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Marca e endereço Av. Miguel Sutil 9300 / Duque de Caxias coincidem; Google explicita Shopping Estação Cuiabá. |
| 12 | Ditado Popular | Ditado Popular | ChIJsYBuoY-xnZMRn-CbJ4ulFIU | R. Sen. Vilas Bôas, 89 - Popular, Cuiabá - MT, 78045-360 | -15.593653900000001, -56.1054588 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome e Rua Senador Vilas Bôas 89 / Popular coincidem; abreviações normalizadas. |
| 13 | Dual Patron Pizzaria | Dual Patron Pizzaria | ChIJ_0PrhA2xnZMRHn1yJda5JDU | Av. das Palmeiras, no 11 - Jardim Imperial, Cuiabá - MT, 78075-850 | -15.6082651, -56.025698899999995 | OPERATIONAL | YES | MEDIUM | NEW | MANUAL_REVIEW_MEDIUM | Nome exato, mas Google aponta Av. das Palmeiras 11 / Jardim Imperial; Duo Rua Dr. Luís Felipe Sabóia Ribeiro 641 / Boa Esperança. Revisão obrigatória. |
| 14 | Empório Serra Grande | Bar e Restaurante Serra Grande | ChIJH-iys_uwnZMRZIJWakzYto0 | R. Dep Milton De Figueiredo, 84 - Morada do Ouro, Cuiabá - MT, 78075-000 | -15.567473, -56.061499399999995 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome distintivo Serra Grande preservado; Rua Dep. Milton de Figueiredo 84 / Morada do Ouro coincide. Variação Empório versus Bar e Restaurante registrada. |
| 15 | Hookerz American Bar | Hookerz Beer Club | ChIJr4U5MoOxnZMRcrHmtTkAXAs | Av. Sen. Filinto Müller, 1398 - Quilombo, Cuiabá - MT, 78043-500 | -15.584876, -56.1033322 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome distintivo Hookerz preservado; Av. Sen. Filinto Müller 1398 / Quilombo coincide. Variação American Bar versus Beer Club registrada. |
| 16 | João e o Boi | João e o Boi | ChIJlefQkySxnZMRWyCRAKOV2ek | Av. São Sebastião, 2623 - Popular, Cuiabá - MT, 78045-400 | -15.592652, -56.103655599999996 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome e Av. São Sebastião 2623 / Popular coincidem. |
| 17 | Kopenhagen (Shopping 3 Américas) | Kopenhagen (Entregas) Cuiabá Shopping 3 Américas | ChIJ-eR99dOxnZMRKgimpXX6KE0 | Kopenhagen Shopping 3 Américas - Av. Brasília, 146 - Lj 218 - Jardim das Américas, Cuiabá - MT, 78060-601 | -15.612328199999999, -56.073374799999996 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Marca, Shopping 3 Américas e Av. Brasília 146 / Jardim das Américas coincidem; Google adiciona loja 218. |
| 18 | La Brasa Burger | cuiaba | ChIJoy8R9xexnZMRtNDLLdT0m7A | Praça Popular - R. Brg. Eduardo Gomes, 01 - Popular, Cuiabá - MT, 78045-350 | -15.5956577, -56.102860899999996 | CLOSED_PERMANENTLY | YES | LOW | NEW | CLOSED | Duas buscas retornam somente o Place nomeado cuiaba, Rua Brigadeiro Eduardo Gomes 01, CLOSED_PERMANENTLY. Nome e número não confirmam La Brasa Burger 362. LOW; Place rejeitado. Não concluir que o restaurante Duo fechou. |
| 19 | Maison Paris | Maison Paris | ChIJA7n7YSuxnZMR_1SRKIXev8s | Shopping Goiabeiras - Av. Jose Monteiro de Figueiredo, 500 - Duque de Caxias - Goiabeiras, Cuiabá - MT, 78043-900 | -15.588096799999999, -56.112383699999995 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome exato e endereço formatado Google Av. José Monteiro de Figueiredo 500 / Duque de Caxias coincidem; Google explicita Shopping Goiabeiras. Número sustentado pelo endereço formatado, não por street_number isolado. |
| 20 | Máfia Pizzaria | Máfia Pizzaria, Restaurante & Chopperia | ChIJt8LAhsCxnZMRayIdR1qjjB4 | Av. Cel. Escolástico, N° 703 - Bandeirantes, Cuiabá - MT, 78010-200 | -15.6003931, -56.088647099999996 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome distintivo Máfia Pizzaria e Av. Cel. Escolástico 703 / Bandeirantes coincidem; diacríticos e prefixo N° normalizados. |
| 22 | Pizzarazzo Cuiabá | Pizzarazzo Cuiabá - Delivery e Retirada | ChIJZc0hQNixnZMRcGUxRelua-A | Av. Presidente Marques, 731 - Quilombo, Cuiabá - MT, 78045-175 | -15.589922399999999, -56.0993607 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome e Av. Presidente Marques 731 / Quilombo coincidem; sufixo Delivery e Retirada não altera a identidade. |
| 23 | Quintal Gastrobar | Quintal Gastrobar | ChIJEwSFTFixnZMRDBmiow_hQ6c | R. do Flamengo, 287 - Jardim Guanabara, Cuiabá - MT, 78010-675 | -15.603798599999998, -56.081877000000006 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome e Rua do Flamengo 287 / Jardim Guanabara coincidem. |
| 24 | Ritorna Pizzaria | Ritorna Restaurante e Pizzaria | ChIJ9es77dqxnZMRzSaM2ec_cs4 | Av. Sen. Filinto Müller, 220 - Goiabeiras, Cuiabá - MT, 78045-410 | -15.594310099999998, -56.1095081 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome distintivo Ritorna e Av. Sen. Filinto Müller 220 / Goiabeiras coincidem. |
| 25 | Rock Amor e Pizza | Rock, Amor e Pizza / Pizzaria em Cuiabá | ChIJ8bNzyLOxnZMRrEtQLXioU0U | R. W, 413 - Jardim Aclimacao, Cuiabá - MT, 78050-244 | -15.5898139, -56.074092199999996 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome e Rua W 413 / Jardim Aclimação coincidem. |
| 26 | Seu Majó (24 de Outubro) | Seu Majó Restaurante - Unidade 24 de Outubro | ChIJq6qqao-xnZMRMPhzMH_yk4g | Rua 24 de Outubro, 602 - Centro Norte, Cuiabá - MT, 78005-330 | -15.593489600000002, -56.1028015 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Marca, unidade 24 de Outubro e Rua 24 de Outubro 602 / Centro Norte coincidem. |
| 27 | Seu Majó (Jd. das Américas) | Seu Majó Restaurante - Unidade Jd. das Américas | ChIJf-qF5YmxnZMR7ZwO6vpLne4 | Av. Brasília, 390 - Jardim das Américas, Cuiabá - MT, 78060-601 | -15.610619699999999, -56.0718931 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Marca, unidade Jardim das Américas e Av. Brasília 390 / Jardim das Américas coincidem. |
| 29 | Vila Sushi | Vila Sushi | ChIJBX_sM4OxnZMRvb5USgouae8 | Av. Sen. Filinto Müller, 1385 - Quilombo, Cuiabá - MT, 78043-400 | -15.5850928, -56.1034067 | OPERATIONAL | YES | HIGH | NEW | ELIGIBLE_HIGH_NEW | Nome e Av. Sen. Filinto Müller 1385 / Quilombo coincidem. |
| 30 | Villa Food | Vila food | ChIJvSlJNACxnZMRgkZiM5wtx_4 | Av. Sen. Filinto Müller - Quilombo, Cuiabá - MT, 78043-409 | -15.585255499999999, -56.103479 | OPERATIONAL | YES | MEDIUM | NEW | MANUAL_REVIEW_MEDIUM | Vila food é nome compatível com Villa Food e mesma avenida/bairro, mas ambas fontes não têm número. Google está muito próximo de Vila Sushi; sem coordenadas Duo ou evidência adicional de unidade, MEDIUM. |

## Multiple units

- Bom Beef: 2 HIGH units; distinct Place IDs and addresses (source IDs 4, 5).
- Cozinha dos Fundos: 3 HIGH units; distinct Place IDs and addresses (9, 10, 11).
- Seu Majó: 2 HIGH units; distinct Place IDs and addresses (26, 27).
- No cross-candidate Place ID collisions, including alternative results.

## GODINNER read-only dedupe

Service-role authenticated GET of public.restaurants, no status/city/merged filter; exact count and complete pagination. All rows including legacy without Place ID included. Observed published=436, pending_review=2; no inactive or other statuses present.

Snapshot: 438 rows, 436 published and 2 pending_review. Cities: Belo Horizonte 400, Nova Lima 35, Madrid 2, Amsterdam 1. No Cuiabá rows, no catalog coordinates within 1 km of the proposed places, no matching Place IDs and no secondary identity matches. Kopenhagen Raja Gabaglia and La Brasa Burger Pampulha are other-city branches, not duplicates. No name-only merging. NEW means absent from the catalog snapshot, not eligible to import.

| Dedupe | Count |
|---|---:|
| NEW | 27 |
| EXISTING_PLACE_ID | 0 |
| EXISTING_SECONDARY_MATCH | 0 |
| POSSIBLE_DUPLICATE | 0 |
| PLACE_ID_COLLISION | 0 |

| Decision | Count |
|---|---:|
| ELIGIBLE_HIGH_NEW | 22 |
| ELIGIBLE_HIGH_EXISTING | 0 |
| MANUAL_REVIEW_MEDIUM | 4 |
| REJECT_LOW | 0 |
| NO_MATCH | 0 |
| CLOSED | 1 |
| PLACE_ID_COLLISION | 0 |

## Google usage — this retry only

- Search calls: 28 (27 initial + 1 alternative-query verification for source ID 18).
- Place Detail calls: 0.
- Retries: 0 (no failed request retried; the alternate query is an additional search).
- Failures: 0.
- OpenAI calls: 0.
- Photo downloads: 0.

## STOP GATES

Triggered: NO. Manifest recovered, credential validation recorded, all searches HTTP 200, full catalog read verified, no Place ID collisions or systemic mismatch. Individual MEDIUM/LOW candidates remain ineligible.

## DATA SAFETY

Database Read YES; Write NO. No imports, migrations, product changes, deploys, ratings, reviews, prices or photos created. Original checkout artifacts remain unchanged; this report is in the dedicated worktree. Dedupe is a point-in-time observation and must be revalidated before any future insert.

## STATUS AND NEXT ACTION

PHASE B PASS. Safe HIGH candidates: 22. Next recommended action: PHASE C — PRE-IMPORT REPORT + BATCH/ROLLBACK DESIGN, awaiting explicit authorization. Phase C was not executed. São Paulo remains BACKLOG.
