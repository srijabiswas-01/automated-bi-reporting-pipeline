# Logic and integrity review ? 6 November 2026

The runtime uses one canonical model (`database/model.py`). `build_model.py` and `build_portal.py` generate contracts and pages; generated files are not separate competing implementations. Apps Script services operate on one locked snapshot, validate it, audit changes, and commit through the redo journal. GitHub Actions and manual ETL runs share the same database writer lock.

## Fixes

- Snapshot foreign-key validation now builds parent-key indexes once in Python and Apps Script.
- Apps Script validates PostgreSQL integer bounds, money precision, dates/timezones, compound quantity checks, original receipt/return lines, cumulative receipt/return limits, inventory reconciliation, and payment/refund limits before commit. The exporter also validates before replacing the last cloud snapshot.
- Date cells in operational date columns use the India calendar date; timestamp columns retain UTC timestamps.
- Portal KPI calculations use active orders, lines, returns, and balances, matching BI revenue rules. Return quantities are indexed instead of repeatedly scanning all returns.
- Purchase completion counts only active posted receipts. Draft receipt quantities cannot close a purchase; cumulative quantities are indexed once per operation.
- ETL batches schema reflection and avoids repeat migration DDL once display-code columns/indexes exist. Watermarks cannot move backwards on older snapshots. Load transactions use SERIALIZABLE isolation; orchestration retains bounded retries and a shared writer lock.
- Integration tests require `TEST_DATABASE_URL`, separating test writes from the normal `DATABASE_URL`. The isolated runner creates a unique temporary schema, restricts the test connection search path to it, and drops that schema afterward.

## File responsibilities

`DemoData.gs` and `BulkDemoData.gs` are optional, idempotent editor entry points for demonstration data. They do not run on hourly exports. `DisplayCodes.gs` assigns immutable labels; it does not replace UUIDs. `GitHubSync.gs` exports; it does not generate sales or customers. Removing these files simply because they were added later would break supported editor functions or code assignment.

`tools/deploy_display_codes.py`, `tools/migrate_display_codes.py`, and `tools/upload_demo_runner.py` are manual maintenance utilities. They are not imported by portal requests or ETL jobs. They are retained for recovery and controlled deployment, not called as additional background migrations.

## Verification

Run the local suite with `python -m pytest -q` (or unittest discovery). Run `python -m tools.test_isolated_postgres` for schema/constraint checks plus the Apps Script scenario ? compressed snapshot ? real PostgreSQL ETL ? replay/deduplication and reconciliation tests. Run `python -m tools.check_database_integrity` for a read-only live audit. Its business fingerprint covers all source rows, including UUIDs, codes, financial values, metadata, and audit entries; pipeline history and watermarks are excluded because normal automation changes them.

These checks do not simulate Google's production authorization dialogs or execute the live hourly trigger. Local changes must be uploaded to Apps Script (and a new version applied to the web-app deployment), and committed to the GitHub repository running ETL, before the production runtime uses them. Preserve the existing script properties, manifest scopes, spreadsheet ID, and deployment URLs.

## Observed results

- Local suite: 34 passed; 2 PostgreSQL tests skipped in that local invocation, then both executed successfully in the isolated Neon schema.
- The first isolated attempt timed out with per-table reflection. It was cleaned up; the repeat with batched reflection passed.
- Generated model/schema/manifest/pages/sample fixtures regenerated without contract drift. No duplicate Apps Script function declarations were found.
- Final live audit: zero validation errors and zero metadata chronology errors. All display-code columns are populated.
- Before/after business fingerprints matched exactly. Customer count stayed 26, product count 31, and sales-order count 51. The latest production ETL run was successful.
- Both temporary test schemas were removed. No production business rows were written during testing.
- Runtime fixes remain local until deployed; live Google authorization and trigger execution were not exercised by the mock adapter.
