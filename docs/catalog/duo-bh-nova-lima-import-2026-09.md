# Duo Gourmet — importação controlada BH e Nova Lima

Data da auditoria: 2026-09-03.

## Fonte e método

- Descoberta: páginas públicas oficiais do Duo Gourmet para Belo Horizonte e Nova Lima.
- Identidade: Google Places API (New), com uma consulta de texto por parceiro.
- Importação automática: apenas correspondências `HIGH` — nome, município e bairro coerentes, Place ID e coordenadas disponíveis, sem indicação de fechamento permanente.
- Dedupe: primeiro por `google_place_id`; depois por nome/localização de um restaurante GODINNER já publicado.

Os dados completos por parceiro, incluindo URL Duo, candidato Google, decisão, confiança e ID GODINNER, estão em [duo-bh-nova-lima-discovery-2026-09.json](./duo-bh-nova-lima-discovery-2026-09.json). O resultado de escrita está em [duo-bh-nova-lima-import-2026-09.json](./duo-bh-nova-lima-import-2026-09.json) e a prova de reexecução idempotente em [duo-bh-nova-lima-rerun-2026-09.json](./duo-bh-nova-lima-rerun-2026-09.json).

## Discovery e matching

| Métrica | Total |
| --- | ---: |
| Parceiros no Duo — Belo Horizonte | 348 |
| Parceiros no Duo — Nova Lima | 27 |
| Total descoberto | 375 |
| Já existentes pelo Place ID | 49 |
| Correspondência secundária HIGH | 1 |
| Novos HIGH | 241 |
| MEDIUM (revisão manual) | 33 |
| LOW (não importado) | 42 |
| Fechados no Google (não importado) | 9 |
| Fora do escopo | 0 |

Foram feitas 375 buscas no Google Places e nenhuma chamada antecipada de foto ou Place Details.

## Escrita aplicada

- 50 restaurantes existentes foram enriquecidos com `accepts_duo_gourmet = true` e `duo_gourmet_checked_at`.
- 241 restaurantes HIGH foram criados como `published`.
- Cada novo registro possui `google_place_id`, endereço, coordenadas, município, `country_code = BR`, Duo confirmado e timestamp de verificação.
- Não foram criados ratings, reviews, likes, listas ou fotos de review.
- Não foram persistidas URLs temporárias nem imagens do Google; as fotos continuam sendo resolvidas pela integração existente a partir do Place ID.
- A faixa editorial de preço permanece `NULL` quando desconhecida. A migration `20260903170000_allow_unknown_restaurant_price_range.sql` removeu a obrigatoriedade anterior para não criar a falsa referência `$$`.

## Dedupe e reexecução

A segunda execução aplicou 0 inserções e manteve 437 restaurantes publicados. Ela apenas atualizou o timestamp de verificação dos 50 registros já conhecidos, sem criar duplicatas.

## Densidade geográfica

| Município | Antes | Depois | Variação |
| --- | ---: | ---: | ---: |
| Belo Horizonte | 175 | 399 | +224 |
| Nova Lima | 18 | 35 | +17 |
| Total BH + Nova Lima | 193 | 434 | +241 |

Principais concentrações após a carga: Lourdes (40), Savassi (30), Vila da Serra (28), Funcionários (24), Castelo (23), Buritis (21), Belvedere (20), Padre Eustáquio (15) e Centro (13).

Ainda sem restaurante publicado entre os bairros presentes na fonte Duo: Diamante, Liberdade, Santa Inês, Jaraguá, Distrito de Macacos e Alphaville Lagoa dos Ingleses. Os casos são mantidos fora da carga quando não atingem `HIGH` ou quando o Google indica encerramento.

## Readiness de localização

**Recomendação: NEEDS MORE DENSITY.** A densidade no núcleo de BH e Nova Lima aumentou materialmente e já há bons candidatos em bairros centrais. Porém, ainda há lacunas relevantes e o fallback de produto para regiões sem candidatos precisa ser validado numa sprint específica antes de remover a localização estática. O estado vazio existente para uma busca de proximidade sem candidatos deve continuar sendo preservado.
