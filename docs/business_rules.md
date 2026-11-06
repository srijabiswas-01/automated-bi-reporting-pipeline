# Business rules and transaction contracts

## Shared conventions

All business data is synthetic until real integrations are configured. Use INR only in this release; prices exclude GST. Money is decimal with two places, quantity is an integer in the product unit, dates are ISO dates, and timestamps are UTC. Display reporting dates in Asia/Kolkata. Postal codes, barcodes, phone numbers and IDs are text. Production IDs are UUIDs generated server-side; readable IDs in the seed are fixtures. Never use sheet row numbers as identifiers.

Every tab has created_at, updated_at, version and is_active. Operational writers own these values; analytics imports preserve source values using a transaction-local superstore.preserve_metadata setting. Do not physically delete referenced business records. Deactivation hides a master from new transactions without rewriting history. Historical transactions remain reportable; never deactivate completed transactions to reverse them.

Google Sheets stores no passwords or API credentials. Users map an authenticated Workspace identity to a role. Administrator maintains masters and permissions; sales staff manage customers, orders and returns; inventory staff manage purchasing and stock; analysts read reporting data. Every mutation is authorized on the backend. The portal rejects empty identities and unregistered/inactive accounts. The dashboard relies on its hosting provider's access controls.

## Masters and prices

Trim names and IDs, normalize SKU to uppercase before uniqueness checks, validate emails when present and reject blank required text. Tax codes are text identifiers; staff supply line tax amounts explicitly in the current portal. Product changes append price history in the same operation. Order lines retain the original unit_price, discount, tax and cost_snapshot even when the product changes.

## Orders, inventory and purchasing

Order status (draft, confirmed, completed, cancelled), fulfilment and payment status are independent. Payment status comes from payment records. Discounts and taxes are line totals; cost_snapshot and unit_price are per unit. No negative stock or implicit backorders.

The implemented counter-sale workflow completes and fulfils each order immediately, reducing on-hand stock and appending negative sale movements. Existing reservations are respected by available-stock checks. Draft confirmation/reservation and cancellation are future workflows. All balance updates and ledger entries commit through one journaled operation. Stock receipts append positive movements for accepted quantities only. Transfers write paired movements and balances. Adjustments require an actor and reason in the audit log. Opening balances require opening movements. Available stock is on-hand minus reserved; reorder when available <= reorder point.

Only approved purchase orders may receive goods. A posted receipt is immutable; corrections use a separately audited reversal workflow. Cumulative received quantity may not exceed ordered quantity. Accepted quantity may not exceed received quantity. Receiving some stock marks the purchase partial; receiving all ordered stock marks it received. Rejected goods do not increase saleable inventory.

Accepted returns reference the original order and line. Cumulative accepted quantity cannot exceed quantity sold. Saleable, approved restocks create positive movements; damaged returns do not. Refund settlement is independent of return acceptance. Services bound refund amounts by the returned original value including proportional tax and by previously settled cash, less prior refunds. Payment and refund records represent staff-confirmed settlements rather than gateway requests.

Direct PostgreSQL operational writers must use SERIALIZABLE transactions and retry serialization failures. Sheets services use LockService, optimistic master versions, UUID request deduplication and a recoverable journal because a multi-tab write is not an ACID transaction. Local tests inject a write interruption and verify replay and retry behavior. Real cloud deployment still requires identity, quota and recovery checks in the selected Workspace environment.

## KPI definitions

Only completed sales count. Net sales = gross line sales - line discounts - discounted value of accepted returns, excluding GST. COGS reverses original unit cost for accepted returned units. Gross profit = net sales - COGS. Gross margin = gross profit / net sales. AOV = net sales / distinct completed orders, including fully returned completed orders. Return rate = accepted units / sold units. Zero denominators produce NULL, not misleading zero percentages.

Current reporting views attribute accepted returns back to the original sale date, so historical periods can change. A future accounting ledger should recognize reversals on the return date if required. Payment/refund cash flows are not revenue. Current inventory value uses current cost and is not FIFO valuation. Inventory turnover requires daily historical inventory snapshots, which are not yet implemented.

## ETL and retry contract

Scheduled and manual runs use a period key such as sales_daily_2026-11-03. Acquire the global PostgreSQL session advisory writer lock before claiming a run; retain the same dedicated connection until completion. This also serializes different backfill periods. A unique partial index limits one running row per period. Lock IDs use a stable SHA-256-derived signed integer. Commit data and watermarks atomically, using source keys and versions for idempotent upserts. Full-snapshot extraction catches equal timestamps and late updates without relying on a timestamp-only filter.

GitHub Actions retries failed loads with bounded attempts and rechecks the latest snapshot hourly. Manual runs skip successful periods unless --force is supplied. A worker must acquire the advisory lock before reconciling an abandoned running record; a stale heartbeat alone never authorizes parallel loading. The lock is released on session death. Invalid snapshots record quality_errors and fail rather than partially advancing watermarks. Optional webhook alerts contain period/run IDs without source rows or secrets.
