# Intelligent Superstore Management & Automated BI Reporting System

Retail operations and reporting application built from the supplied project blueprint. Includes the requested Apps Script pages and services, PostgreSQL model, shared ETL, primary GitHub workflow, independent Airflow recovery DAG and six-page Streamlit dashboard.

**Fully automatic cloud route:** [Google Sheets → private GitHub → Neon setup](docs/automatic_neon_github.md). Apps Script exports hourly; GitHub Actions loads Neon. No Google Cloud Console, service account, Excel downloads or local Docker is required for this route. Create the private repository and Neon project, initialize the database using its GitHub workflow, then configure and run installAutomaticSync in Apps Script.

The portal provides 19 dedicated pages with search, pagination, CSV exports, schema-driven master forms, purchasing, goods receipts, inventory adjustments/transfers, completed counter sales, payments, returns, refunds, shipping, user administration and audit records. Backend services enforce role permissions, preserve historical prices, reject overselling and deduplicate retried requests. A chunked redo journal recovers interrupted multi-tab writes.

Readable references such as CUS-0001, PRD-0001 and SO-000001 are assigned to existing and new business records while UUID relationship keys remain unchanged. Portal tables and dropdowns display these codes and names; the automated ETL synchronizes them to Neon. See [display-code migration details](docs/display_codes.md).

## Run locally

Use Python 3.12. Node.js 22 runs the Apps Script service tests. Start the dashboard immediately with the included synthetic data:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m streamlit run dashboard/app.py
```

The dashboard defaults to **synthetic CSV demo mode** and requires no cloud credentials. It includes executive, sales, product, customer, inventory and pipeline pages. To load PostgreSQL instead, set a local password and matching DATABASE_URL in `.env`, start Docker Desktop and run:

```powershell
docker compose up -d --wait
python -m etl.pipeline --period 2026-11-03
python -m etl.pipeline --period 2026-11-03
```

The second run skips the completed period. Set DASHBOARD_DEMO=false to read PostgreSQL. Use --force to synchronize newer source versions for a previously successful period. Initialization SQL runs only on first creation of an empty Docker volume. Existing databases require reviewed migrations; see [deployment instructions](docs/deployment.md).

The sample sells two paper reams at INR 300 each with INR 60 total discount, then accepts one return. Expected results: **INR 270 net sales, INR 200 COGS, INR 70 gross profit, one completed order, nine units available, zero ledger difference**. Tax and cash settlement are separate from revenue. All names, contacts and transactions are synthetic.

## Files

- [Data dictionary](docs/data_dictionary.md): all columns, types, keys and field rules.
- [Business rules](docs/business_rules.md): stock, order, return, KPI and failover contracts.
- [Architecture](docs/architecture.md): system boundaries and implementation status.
- [Deployment guide](docs/deployment.md): Apps Script, clasp, Google credentials, PostgreSQL, Actions, Airflow and Streamlit hosting.
- `apps-script/`: the complete portal shell, 19 pages, shared UI partials and backend services.
- `etl/`: source extraction, typed conversion, validation, versioned loading, locking, logging and optional failure webhook.
- `dashboard/`: six Streamlit reporting pages with Plotly charts, filters and CSV downloads.
- `airflow/`: independent recovery DAG and its deployment image.
- `.github/workflows/`: daily primary ETL and CI against disposable PostgreSQL.
- `database/model.py`: canonical model; regenerate derived schema, dictionary and templates after editing.
- `database/constraints.sql`: cross-record receipt and return validation.
- `database/reporting_views.sql`: sales, customers, inventory and reconciliation queries.
- `database/sheets_manifest.json` and `sample_data/sheets/`: one tab definition and header template per table.

## Generate and test

```powershell
python tools/build_model.py
python tools/build_portal.py
python tools/build_sample_data.py
python -m unittest discover -s tests -v
```

Service tests use an in-memory Apps Script adapter to check duplicates, historical prices, overselling, returns, partial receipts, identity checks, retry deduplication and interrupted-write recovery. Dashboard tests render all six pages. PostgreSQL integration tests run in CI and skip locally unless DATABASE_URL is exported for a disposable initialized database.

## Connect and deploy

**Cannot use Google Cloud Console?** Use the [Excel snapshot import](docs/import_without_cloud_console.md). Download the complete operational Sheet as `sample_data/superstore.xlsx`, set ETL_SOURCE=xlsx, and run `python -m etl.pipeline --force`. This imports a downloaded snapshot; later Sheet changes require a fresh download.

Configure the Apps Script project and initialize its tabs before deploying the portal. For the selected cloud route, follow [automatic Neon/GitHub setup](docs/automatic_neon_github.md): GitHubSync exports hourly to a private repository, snapshot pushes trigger ETL, and an hourly Actions schedule retries the latest snapshot. No Google service account is required for that route. Airflow remains an optional independently hosted recovery service and uses the same PostgreSQL advisory lock; it is not provisioned automatically.

Code and local demo data are included; cloud accounts, credentials, live deployment and real-user authorization checks require your environment. Inventory turnover/lot ageing, draft-order reservations and approval/cancellation workflows are extensions beyond the implemented counter-sale workflow. The Sheets journal rewrites snapshots and is intended for portfolio-scale datasets. Payment/refund entries record staff-confirmed settlements; no payment gateway is connected.
