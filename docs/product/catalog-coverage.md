# Catalog coverage requests

COV1 detects a lack of **published** GODINNER restaurants only after a visitor has authorized device location and the temporary resolver returns city and country. The app sends the device coordinates only to Google Geocoding to obtain that region; GODINNER does not persist the coordinates, address, email, username, browser fingerprint or precise device data.

The controlled `record_catalog_coverage_signal` RPC checks published coverage on the server and records only city, optional state, country, timestamps and aggregate counters. Direct client access to the request and signal tables is revoked. A private technical actor key deduplicates a signed-in user or an opaque session for one city; repeat renders update `last_detected_at` without inflating counts. A second user or a new session can create another signal.

The Home screen continues with its current catalog fallback while region resolution or the coverage check is pending. If the RPC reports no published coverage, or if its telemetry write cannot complete, the zero-coverage UI remains usable and links to the national catalog. No notification promise, auto-enrichment, background retry loop, nearby tracking or public demand list is included in COV1.

The current restaurant schema has canonical city and country, but not a canonical state field. State is retained for demand deduplication; the published-coverage decision is therefore city + country until a future catalog schema introduces a reliable restaurant state field.
