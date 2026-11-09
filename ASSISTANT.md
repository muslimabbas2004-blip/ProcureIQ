# Procurement assistant

The assistant now plans read-only queries against the complete live store rather
than generating answers from eight example records. It supports the item and
vendor masters, joined purchase-order lines, order headers, historical purchases,
quotations, import metadata, estimated savings, and price changes. It does not
read user credentials or imported-file preview contents.

Queries can combine filters, date ranges, grouping, sorting, pagination, counts,
distinct counts, sums, averages, minimum/maximum values, and weighted averages.
Up to four queries answer a multi-part question. Arithmetic is performed by the
query engine; the provider only produces a validated plan. The response includes
result tables, applicable charts, matched counts, filters, scope, and sources.
Follow-ups carry the previous validated query plan. No SQL or generated code is
executed. Records beyond the displayed limit still contribute to aggregates.

## Enable flexible natural-language planning

1. Copy `server/.env.example` to `server/.env`.
2. Set `GEMINI_API_KEY` to a valid server-side Gemini API credential.
3. Set `GEMINI_MODEL` to a generateContent model available to that account that
   supports JSON output. Use the exact model ID from your provider account.
4. Refresh the assistant. Configuration is read on each request; the header
   reports configuration, not a guarantee of provider availability.

Do not use a `VITE_` API-key variable. The previous implementation embedded a
credential in both client and server source. That credential has been removed
from these files; revoke/rotate it with the provider because previous browser
bundles and Git history may still contain it.

Only the question, recent questions, previous query plan, schema, and up to 20
matching item/vendor names and IDs are sent to the provider. Full transactional
data and calculated results stay on the application server. Provider credentials
are transmitted in the request header, not a URL.

The integration uses Google's [generateContent JSON output configuration](https://ai.google.dev/gemini-api/docs/structured-output?lang=rest)
plus strict application-level validation. There is a 25-second provider timeout,
a maximum of four in-flight assistant requests, and bounded plan/result sizes.
This does not bypass provider quotas or make request volume unlimited.

## Built-in mode

Without provider configuration, or when the provider fails, an explicitly
labelled local interpreter handles common queries. Examples:

- How many items and vendors are in the database?
- Top 10 suppliers by spend in 2026
- Show pending purchase orders above 100000
- Which items have no purchase orders?
- Compare prices for I001
- Compare average quotation prices by supplier
- Show monthly historical purchase spend
- Which datasets have been imported?
- Show estimated savings opportunities
- And in 2025
- Show the next 20 results

The built-in interpreter is narrower than AI planning. Use explicit dates,
names/IDs, and measures. Review the displayed filters. Ambiguous or unsupported
questions may require rephrasing, even with a provider configured. No assistant
can guarantee every possible question or facts absent from the imported data.

## Interpretation

- Default order spend excludes Draft and Cancelled orders; all-status queries
  can include them explicitly. The response states its scope.
- Item/vendor master statistics use live orders across the full recorded period.
  Date-specific analysis should use order headers or joined lines.
- Historical purchases are a separate dataset and may overlap order history.
- Quotations are offers, not actual purchases. Compare like items and units;
  a supplier-wide average across different materials is not a price benchmark.
- Savings are estimates from observed price differences, not realized savings.
- Inventory, invoices, budgets, promised/actual delivery dates, contracts,
  payments, and quality measures are not present. No reliability or lateness
  conclusions should be inferred from order status alone.
- Queries use the live backend store, even if another existing demo screen
  still displays mock data. This change does not connect all legacy demo pages.

## Verification

Run `npm --prefix server run test:assistant` and
`npm --prefix server run test:scale`. Tests use isolated synthetic records and
never overwrite persisted company data. Provider transport is mocked in tests;
a real provider response cannot be verified until credentials/model are set.
The scale test includes 45,000 items, 500 vendors, 100,000 orders and 200,000 lines.

Production authentication and database deployment limits remain as documented
in `SCALABILITY.md`; query validation is not a substitute for access control.
