# SEO foundation — public restaurants

## Baseline evidence

On 2026-09-28 Production 58b5f9f passed scripts/verify-seo.mjs for brand/legal pages, robots and social image. Public restaurant HTML inherited the generic site title, had no canonical, H1 or JSON-LD; a nonexistent restaurant URL returned 200/index,follow. Sitemap intentionally contained only four brand/legal URLs.

## Scope of this first iteration

- Per-restaurant title, description, official canonical, Open Graph and Twitter metadata.
- Visible server-rendered name, address, city and editorial price while the interactive profile loads. Not hidden crawler-only content.
- Basic Restaurant/BarOrPub JSON-LD with real public facts. No invented ratings, Google reviews, opening hours, authors, precise user location or private media.
- Anonymous, non-privileged Supabase reads with explicit public columns, published status and no merged record. Per-request memoization shares page and metadata lookup; no persistent authenticated cache.
- Missing records handled server-side; database/authorization errors are not converted to false 404s.
- Owner/admin access to a pending record still uses session RLS and the existing interactive workflow. It gets generic noindex metadata, not public structured data. No schema/RLS changes.
- Published restaurant URLs in dynamic sitemap, 500-row batches, deterministic order, deduplication; fail on incomplete reads. Preview sitemap stays empty. No artificial lastmod dates or city pages without coverage.

## Tests / validation

Run test:seo (12 behavioral cases), existing regression, test:review-search, test:maps, TypeScript, lint, build and git diff --check. scripts/verify-restaurant-seo.mjs checks initial HTML and true missing-page HTTP status with normal, Googlebot and Twitterbot requests. scripts/verify-seo.mjs still checks brand/legal protections and now allows a catalog-expanded sitemap.

Shared database writes are not part of validation. If a local environment contains protected-variable placeholders, validate with the deployment's real environment; do not weaken credential protection. Preview must remain noindex. Verify authenticated pending workflow manually if a session is available; isolated RLS mocks do not prove remote policy configuration.

## Next priorities, not included

Search Console coverage/indexing baselines and sitemap submission after Production approval; real-device performance and Core Web Vitals; per-city/cuisine content only with real coverage; richer public rating schema only after aggregate eligibility audit. Neither sitemap nor structured data guarantees indexing, rankings or star snippets.

References: https://developers.google.com/search/docs/appearance/structured-data/local-business and https://developers.google.com/search/docs/crawling-indexing/block-indexing .
