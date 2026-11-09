# Capacity and operation

The catalog, order register, and supplier spend report use server-side search,
sorting, and pagination. Only the displayed page is downloaded and rendered.
Search is debounced 250 ms and superseded requests are cancelled. CSV exports
are explicitly limited to the displayed page.

`GET /api/items`, `/api/vendors`, and `/api/purchase-orders` return
`{ data, total, page, pageSize }`. Defaults: page 1, 50 rows. Maximum: 500 rows.
Parameters: `q`, `sort` (an allowlisted record field), `direction=asc|desc`.
Invalid page sizes/sort keys return 400. Pages beyond the end clamp to the last
page. This replaces the previous unbounded array response.

Analytics use ID maps, lines grouped by item, and cached item aggregates,
savings, and price changes. Imports invalidate those caches. Any future code
that mutates store arrays must call `invalidateQueries()` before querying them.
Returned aggregate arrays are copies so sorting does not corrupt cached order.

Imports accept up to 50 MiB per request and 100,000 rows per dataset. Split
larger imports. A multi-dataset import persists once after processing the batch.
Persistence replaces the JSON file through a temporary file, and write errors
are reported. Import failures no longer fall back to a browser-only success.

## Reproduce the capacity check

Run `npm --prefix server run test:scale` from the project directory.
The test creates synthetic data in its own process and never writes the store.
It checks aggregates, cache invalidation, pagination boundaries, search,
invalid inputs, and mixed HTTP traffic through the actual controllers.

Local result, November 7, 2026, Node 24.15.0:

| Measurement | Result |
| --- | --- |
| Vendors / items | 500 / 45,000 |
| Orders / order lines | 100,000 / 200,000 |
| Cold analytics | 1,040 ms |
| Mixed requests / concurrency | 100 / 20 |
| Median / p95 request latency | 610 / 978 ms |
| Process resident memory | 436 MiB |

These are a short synthetic local benchmark, not a sustained throughput SLA.
The test does not measure browser rendering, import latency, disk durability,
AI provider performance, or real company data distributions.

## Deployment limits

This remains a **single-process, in-memory store with JSON persistence**. Run
one API process only against the data file. Imports serialize the entire store
synchronously and can pause requests. Keep backups of `server/data/store.json`.
Do not run multiple replicas or cluster workers against that file.

Before multi-server deployment, migrate persistence to a transactional database
with indexed IDs and foreign keys, and move large imports into background jobs.
Real capacity also depends on transaction history, concurrent users, and import
frequency, not just item/vendor counts. Benchmark the intended deployment with
representative data and sustained traffic before setting a production SLA.

Some existing comparison/analytics screens still use demo computations; this
change connects the catalog, order register, and supplier spend report to live
paged data, not every existing demo screen. Existing demo authentication also
needs separate production hardening before exposing company data publicly.

For deployment, build the frontend with `npm run build`, serve `dist` through
a web server, and run the compiled backend with `npm --prefix server run build`
then `npm --prefix server start` (working directory must remain consistent).
The Vite development server is for local development.
