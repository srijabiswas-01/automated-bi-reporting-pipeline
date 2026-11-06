# Deployment and operating guide

**Selected fully automatic route:** follow [automatic_neon_github.md](automatic_neon_github.md) for Google Sheets → private GitHub → Neon. That route requires neither Google Cloud Console nor local Docker. The Docker, service-account and Excel sections below describe alternative modes.

## 1. Local demonstration

Use Python 3.12 and Node.js 22 for the documented environment. Docker Desktop is needed for PostgreSQL. From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python tools/build_model.py
python tools/build_portal.py
python tools/build_sample_data.py
python -m unittest discover -s tests -v
python -m streamlit run dashboard/app.py
```

The dashboard defaults to a clearly marked synthetic CSV demonstration and does not need PostgreSQL. All six pages are available from its navigation. The HTML portal requires Apps Script deployment; opening Index.html as a local file does not supply google.script.run.

## 2. PostgreSQL and the ETL

Choose a local password in .env and update DATABASE_URL to match. Start Docker Desktop, then:

```powershell
docker compose up -d --wait
python -m etl.pipeline --period 2026-11-03
python -m etl.pipeline --period 2026-11-03
```

The first run loads the synthetic CSV snapshot, the second skips the successful reporting period. Use --force to recheck changed source versions. It does not duplicate existing rows. Set DASHBOARD_DEMO=false to inspect PostgreSQL in Streamlit. Do not also import seed.sql into a database already loaded from those same CSVs. For SQL-only verification on an empty initialized database, import seed.sql and tests/verify_database.sql instead.

Docker initialization scripts run once when its database volume is empty. Existing Phase 1 databases require an explicit trigger-function migration: replace touch_record with the updated definition in schema.sql so superstore.preserve_metadata is respected. Do not replay CREATE TABLE against an existing database.

The loader extracts a complete snapshot to validate relationships and reconciliation, then incrementally writes only records with a greater source version. Watermarks are saved for monitoring, not used to discard source rows. Missing records do not mean deletion: deactivate with a newer version. Source versions must never be reset. CSV fixtures and live Sheets are separate sources; use separate databases when switching to a new operational deployment.

## 3. Apps Script management portal

1. Create a private Google Spreadsheet and a standalone Apps Script project in the same Google Workspace organization as portal users.
2. Replace scriptId in .clasp.json with your project ID. Install Google's clasp CLI, sign in, enable the Apps Script API, then run `clasp push`. Alternatively copy the apps-script files into the editor, preserving their names.
3. In the editor's Project Settings, add Script Properties SPREADSHEET_ID and BOOTSTRAP_ADMIN_EMAIL. Use your own authorized Workspace email for bootstrap.
4. Run initializeSuperstore from the editor and authorize it. It creates the tab headers, administrator and roles, plus hidden journal and revision tabs. This bootstrap is restricted to the configured email.
5. Deploy as a web app, executing as the deploying owner, accessible to the Workspace domain only. The backend requires a nonempty active-user email and an active users record. Identity availability depends on the deployment/domain configuration; verify two real users before sharing access. If email is unavailable the portal denies access. Do not replace this check with the effective owner's email.
6. Open Administration to create stores, brands and segments, then categories, suppliers, products and customers. Add users with the appropriate role. Use purchasing and receipt pages to create initial stock, then record counter sales.
7. The app must be the only operational writer. Do not give staff direct sheet edit access. Only a trusted owner may edit authorization tabs or script properties.

All ordinary mutations require role authorization, optimistic versions for master edits and UUID request IDs for retry deduplication. Records have server-managed metadata. All API calls acquire a script-wide lock and recover a prepared journal before reading. The journal is a redo protocol: if a response is lost after commit preparation, retrying the same request ID returns the original reference. A changed transaction should use a fresh form/request ID. External side effects such as payment gateway calls are not implemented; payments/refunds record staff-confirmed settlement only.

This portfolio implementation rewrites a complete operational snapshot on each mutation and includes a complete snapshot in a chunked hidden journal. It suits small datasets; it is subject to Apps Script execution, memory and Sheets quotas. Audit entries and individual field values must fit Sheets cell limits. Production scale needs row-level writes, durable transaction storage, pagination and a dedicated operational database. The service supports immediately completed counter sales; draft order reservation, approval routing and cancellation workflows require extensions.

## 4. Google Sheets extraction

### Load and verify operational demo records

After initialization, run `loadAndTestDemo` from the Apps Script editor as an administrator. DemoData.gs creates TEST DEMO masters, purchases and receives ten units, sells two units, settles INR 600 and records delivery through the same authorized service API used by the portal. It verifies stock of eight units, net sales of INR 600, gross profit of INR 200, stock-ledger reconciliation, duplicate retry handling, and rejection of overselling, duplicate SKUs, excessive returns and overpayment. The execution log prints a JSON report with IDs and named checks.

The runner preserves existing rows and uses stable request IDs, so rerunning it resumes without duplicating the sample transactions. The expected figures refer only to its labeled test records. Leave those records unchanged until verification completes; modifying them afterward can cause a later rerun to fail its expected-result checks. It does not remove its test data automatically. Local service tests use an in-memory Sheets adapter; they do not establish that the runner has executed successfully in Google.

`python tools/upload_demo_runner.py` can upload only the additional runner by staging a fresh copy of the remote project and preserving its existing files and manifest. It verifies code readback but does not execute the runner or publish a new web deployment. Refresh the portal after running the editor function to see the inserted data; redeployment is unnecessary for a data-only update.

For a larger related dataset, run `loadSupermarket50` from BulkDemoData.gs in the editor. It adds 50 additional completed sales (existing sales remain), 30 supermarket products in ten categories, 24 customers and addresses, six suppliers, six brands, three stores, 18 purchase orders/receipts, stock ledgers, 50 settled payments, ten delivered shipments and five accepted returns/refunds. Sales span approximately two months with multiple basket sizes, quantities, discounts, channels, repeat customers and payment methods. All records are explicitly synthetic and marked SYN50. Prices exclude tax; the dataset is not a representation of statutory GST treatment or statistically unbiased retail demand.

The bulk loader builds changes in memory using the operational services, validates them, then writes one journaled snapshot under the script lock. It neither clears existing records nor requires entering each form. Its completion marker prevents a rerun from creating another 50 sales. An interrupted prepared commit is replayed by recovery. Avoid editing SYN50 records until its checks pass; later real transactions against those same products can change expected counts and payment totals. Upload just this runner with `python tools/upload_demo_runner.py --file BulkDemoData.gs`, preserving the current remote manifest. Local tests additionally pass the resulting full snapshot through ETL type, foreign-key, return, receipt and inventory-ledger validation.

Create a Google Cloud service account, enable the Google Sheets API, and share the operational spreadsheet with its email as a viewer. Keep its credentials private. Set ETL_SOURCE=sheets, SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON (the JSON content, not a file path) in the worker environment. The extractor checks hidden journal/revision markers before and after the batch read; it rejects an in-progress or changing snapshot.

The service account needs no portal user record because it reads through the Sheets API and never invokes portal mutation functions. All operational tables, including empty ones, must retain their exact generated headers. User identifiers and roles are needed for audit foreign-key validation. Use least-privilege reporting database credentials for the dashboard and separate ETL credentials for writes.

## 5. GitHub Actions primary scheduler

Push this project to your own private GitHub repository. Configure the Actions secret DATABASE_URL using a direct, TLS-enabled Neon connection and optionally ALERT_WEBHOOK_URL. Run initialize_neon.yml once on the empty database. Configure GitHubSync.gs to export operational/snapshot.json.gz from Apps Script. primary_etl.yml runs on snapshot pushes and hourly at minute 17, with three bounded attempts. Every run rechecks newer source versions using --force, so a second update in the same day is not skipped. Manual dispatch accepts a reporting date. Secrets are passed through environment variables; manual date input is passed as a quoted shell argument. The reporting database is separate from CI's ephemeral PostgreSQL service. See automatic_neon_github.md for the complete setup.

ci_tests.yml uses a disposable PostgreSQL 16 service for schema, views, fixture, constraints, duplicate-load and advisory-lock checks. Do not run test_postgres_integration.py against operational data: it assumes the single synthetic fixture and manipulates test reporting periods. The regular suite skips it unless TEST_DATABASE_URL is explicitly exported.

## 6. Publish the dashboard

Deploy dashboard/app.py on a Streamlit-capable host with requirements.txt, set DASHBOARD_DEMO=false and provide a read-only PostgreSQL DATABASE_URL. Protect the dashboard with the hosting provider's access controls; it contains customer data and has no standalone login implementation. The UI catches connection failures without displaying database credentials. Refresh clears the 60-second data cache.

Before operational use, run cloud identity, permission, interrupted-write and retry checks in your own environments. No script IDs, service accounts, cloud resources, public URLs or real credentials are included in this repository.

Official API references: [Apps Script client/server calls](https://developers.google.com/apps-script/guides/html/communication), [Session identity availability](https://developers.google.com/apps-script/reference/base/session), [SQLAlchemy PostgreSQL upserts](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html).
