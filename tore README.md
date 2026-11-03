warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/README.md b/README.md[m
[1mindex 37abb81..9b9ac1f 100644[m
[1m--- a/README.md[m
[1m+++ b/README.md[m
[36m@@ -1,433 +1,62 @@[m
[31m-Complete Project Blueprint: Superstore Retail Management & Automated Business Intelligence System[m
[31m-Full-stack data analytics, retail operations, ETL automation, workflow orchestration and business intelligence[m
[32m+[m[32m# Intelligent Superstore Management & Automated BI Reporting System[m
 [m
[31m-We will develop this as an end-to-end, industry-oriented portfolio project, combining a Superstore Management Portal, Google Sheets data storage, Python ETL, PostgreSQL, GitHub Actions, Apache Airflow and a Streamlit Business Intelligence Dashboard.[m
[32m+[m[32mRetail operations and reporting application built from the supplied project blueprint. Includes the requested Apps Script pages and services, PostgreSQL model, shared ETL, primary GitHub workflow, independent Airflow recovery DAG and six-page Streamlit dashboard.[m
 [m
[31m-The project will demonstrate how a retail organisation can capture operational data, manage products and customers, track transactions, automate reporting, detect pipeline failures and support data-driven decisions.[m
[31m-1. Project overview[m
[31m-Component	Project specification[m
[31m-Project title	Intelligent Superstore Management & Automated BI Reporting System[m
[31m-Industry	Retail and e-commerce[m
[31m-Project type	Full-stack data management and analytics engineering[m
[31m-Data source	Custom HTML forms connected to Google Sheets[m
[31m-Operational storage	Google Sheets via Google Apps Script[m
[31m-Analytical database	PostgreSQL[m
[31m-Data processing	Python, Pandas, SQLAlchemy[m
[31m-Primary automation	GitHub Actions[m
[31m-Backup automation	Apache Airflow[m
[31m-BI dashboard	Streamlit and Plotly[m
[31m-Version control	GitHub[m
[31m-Deployment	Cloud-hosted web application, database and independent Airflow service[m
[31m-Target users	Store administrators, sales staff, inventory managers and business analysts[m
[32m+[m[32mThe portal provides 19 dedicated pages with search, pagination, CSV exports, schema-driven master forms, purchasing, goods receipts, inventory adjustments/transfers, completed counter sales, payments, returns, refunds, shipping, user administration and audit records. Backend services enforce role permissions, preserve historical prices, reject overselling and deduplicate retried requests. A chunked redo journal recovers interrupted multi-tab writes.[m
 [m
[31m-Project objectives[m
[31m-1. Develop an integrated retail data-management portal for product, customer, supplier, purchase, sales and inventory operations.[m
[31m-2. Implement structured, validated data storage using Google Sheets and Google Apps Script.[m
[31m-3. Develop a Python-based ETL pipeline that extracts, validates, transforms and loads retail data into PostgreSQL.[m
[31m-4. Automate reporting through GitHub Actions, with Apache Airflow providing independent recovery and failover.[m
[31m-5. Build an interactive Superstore BI dashboard to analyse revenue, profitability, customer behaviour, inventory and operational performance.[m
[31m-6. Implement monitoring, auditability, data-quality checks and automated failure notifications.[m
[31m-2. Complete system architecture[m
[31m-Superstore Management Web Portal[m
[31m-HTML + CSS + JavaScriptProduct | Customer | Supplier | Sales | Purchasing | Inventory | Returns[m
[32m+[m[32m## Run locally[m
 [m
[32m+[m[32mUse Python 3.12. Node.js 22 runs the Apps Script service tests. Start the dashboard immediately with the included synthetic data:[m
 [m
[31m-Google Apps Script Web Backend[m
[31m-Authentication, server-side validation, CRUD operations and auditing[m
[32m+[m[32m```powershell[m
[32m+[m[32mpython -m venv .venv[m
[32m+[m[32m.\.venv\Scripts\Activate.ps1[m
[32m+[m[32mpip install -r requirements.txt[m
[32m+[m[32mCopy-Item .env.example .env[m
[32m+[m[32mpython -m streamlit run dashboard/app.py[m
[32m+[m[32m```[m
 [m
[31m-Google Sheets Operational Database[m
[31m-Structured master and transaction tables[m
[32m+[m[32mThe dashboard defaults to **synthetic CSV demo mode** and requires no cloud credentials. It includes executive, sales, product, customer, inventory and pipeline pages. To load PostgreSQL instead, set a local password and matching DATABASE_URL in `.env`, start Docker Desktop and run:[m
 [m
[31m-ETL Orchestration Layer[m
[31m-GitHub Actions[m
[31m-Primary scheduler[m
[32m+[m[32m```powershell[m
[32m+[m[32mdocker compose up -d --wait[m
[32m+[m[32mpython -m etl.pipeline --period 2026-11-03[m
[32m+[m[32mpython -m etl.pipeline --period 2026-11-03[m
[32m+[m[32m```[m
 [m
[31m-Apache Airflow[m
[31m-Backup scheduler[m
[32m+[m[32mThe second run skips the completed period. Set DASHBOARD_DEMO=false to read PostgreSQL. Use --force to synchronize newer source versions for a previously successful period. Initialization SQL runs only on first creation of an empty Docker volume. Existing databases require reviewed migrations; see [deployment instructions](docs/deployment.md).[m
 [m
[32m+[m[32mThe sample sells two paper reams at INR 300 each with INR 60 total discount, then accepts one return. Expected results: **INR 270 net sales, INR 200 COGS, INR 70 gross profit, one completed order, nine units available, zero ledger difference**. Tax and cash settlement are separate from revenue. All names, contacts and transactions are synthetic.[m
 [m
[32m+[m[32m## Files[m
 [m
[32m+[m[32m- [Data dictionary](docs/data_dictionary.md): all columns, types, keys and field rules.[m
[32m+[m[32m- [Business rules](docs/business_rules.md): stock, order, return, KPI and failover contracts.[m
[32m+[m[32m- [Architecture](docs/architecture.md): system boundaries and implementation status.[m
[32m+[m[32m- [Deployment guide](docs/deployment.md): Apps Script, clasp, Google credentials, PostgreSQL, Actions, Airflow and Streamlit hosting.[m
[32m+[m[32m- `apps-script/`: the complete portal shell, 19 pages, shared UI partials and backend services.[m
[32m+[m[32m- `etl/`: source extraction, typed conversion, validation, versioned loading, locking, logging and optional failure webhook.[m
[32m+[m[32m- `dashboard/`: six Streamlit reporting pages with Plotly charts, filters and CSV downloads.[m
[32m+[m[32m- `airflow/`: independent recovery DAG and its deployment image.[m
[32m+[m[32m- `.github/workflows/`: daily primary ETL and CI against disposable PostgreSQL.[m
[32m+[m[32m- `database/model.py`: canonical model; regenerate derived schema, dictionary and templates after editing.[m
[32m+[m[32m- `database/constraints.sql`: cross-record receipt and return validation.[m
[32m+[m[32m- `database/reporting_views.sql`: sales, customers, inventory and reconciliation queries.[m
[32m+[m[32m- `database/sheets_manifest.json` and `sample_data/sheets/`: one tab definition and header template per table.[m
 [m
[31m-Shared Python ETL Engine[m
[31m-Extraction → Validation → Transformation → Incremental Load[m
[32m+[m[32m## Generate and test[m
 [m
[31m-PostgreSQL Analytics Database[m
[31m-Clean relational tables, SQL models, reporting views and pipeline logs[m
[32m+[m[32m```powershell[m
[32m+[m[32mpython tools/build_model.py[m
[32m+[m[32mpython tools/build_portal.py[m
[32m+[m[32mpython tools/build_sample_data.py[m
[32m+[m[32mpython -m unittest discover -s tests -v[m
[32m+[m[32m```[m
 [m
[31m-Streamlit Business Intelligence Dashboard[m
[31m-Sales | Profit | Customers | Inventory | Shipping | Pipeline Health[m
[32m+[m[32mService tests use an in-memory Apps Script adapter to check duplicates, historical prices, overselling, returns, partial receipts, identity checks, retry deduplication and interrupted-write recovery. Dashboard tests render all six pages. PostgreSQL integration tests run in CI and skip locally unless DATABASE_URL is exported for a disposable initialized database.[m
 [m
[31m-Operational Monitoring and Notifications[m
[31m-Data quality, late loads, failures, alerts and recovery[m
[32m+[m[32m## Connect and deploy[m
 [m
[31m-There are two distinct update processes:[m
[31m-- Operational updates: When staff submit a form, Google Apps Script immediately validates and records the data in Google Sheets.[m
[31m-- Reporting updates: GitHub Actions or Airflow reads new and changed data, processes it and updates PostgreSQL. Streamlit then displays the latest synchronised results.[m
[31m-This separation is important because the sales-entry system should not stop working just because the analytics pipeline is temporarily unavailable.[m
[32m+[m[32mReplace the placeholder scriptId in .clasp.json, configure Apps Script properties, run initializeSuperstore in the editor, then deploy the domain-restricted web app. Configure the Google Sheets service account and GitHub secrets for scheduled ETL. Deploy Airflow independently; its backup checks missed or failed periods after 03:00 UTC while the primary starts at 02:00 UTC. Both use the same PostgreSQL advisory lock. Follow [docs/deployment.md](docs/deployment.md) for exact steps and official API references.[m
 [m
[31m-3. Superstore management modules[m
[31m-We will build the following management functions.[m
[31m-[m
[31m-Module 1 — Product Master Management[m
[31m-[m
[31m-Create, search, edit and deactivate products. Store unique SKUs, product names, brands, categories, subcategories, GTIN/barcodes where applicable, tax codes, units of measure, costs, selling prices, supplier relationships and product status. Historical product price changes will be preserved.[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-Module 2 — Customer Relationship Management[m
[31m-[m
[31m-Create and maintain customer profiles with unique IDs, individual/business customer type, contact information, address, customer segments and account status. Purchase frequency, customer value and order history will be derived automatically.[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-Module 3 — Supplier Management[m
[31m-[m
[31m-Manage suppliers, contacts, supplier product catalogues, lead times, purchasing terms, supplier status and performance indicators.[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-Module 4 — Purchasing and Goods Receipt[m
[31m-[m
[31m-Create purchase orders, select suppliers and products, capture quantities and negotiated costs, approve purchases, register received goods and distinguish fully received from partially received orders.[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-Module 5 — Inventory and Stock Control[m
[31m-[m
[31m-Monitor stock by product and store, receive stock, record adjustments, process stock transfers, maintain reorder points and generate low-stock alerts. Each stock adjustment will produce an auditable movement record.[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-Module 6 — Sales and Order Processing[m
[31m-[m
[31m-Create sales orders with multiple line items, registered products, quantities, price snapshots, discounts and taxes. Track payment, order and fulfilment status separately to avoid incorrect accounting.[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-Module 7 — Returns, Refunds and Shipping[m
[31m-[m
[31m-Track return requests, reasons, accepted quantities, refund status, restocking decisions, delivery methods, carrier references and dispatch/delivery timestamps.[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-Module 8 — Analytics and System Administration[m
[31m-[m
[31m-Provide sales and profit analytics, customer segmentation, product performance, inventory KPIs, pipeline monitoring, user permissions, change logs and reporting freshness information.[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-4. Industry-standard data model[m
[31m-We must design the underlying tables before creating the HTML forms. The forms should be generated from business requirements and valid data relationships, not the other way around.[m
[31m-Master data[m
[31m-Table	Main fields[m
[31m-products	product_id, sku, product_name, category_id, brand_id, unit, cost_price, selling_price, tax_code, status[m
[31m-categories	category_id, category_name, parent_category_id[m
[31m-customers	customer_id, customer_type, full_name, email, phone, segment_id, status[m
[31m-customer_addresses	address_id, customer_id, city, state, postal_code, country, address_type[m
[31m-suppliers	supplier_id, supplier_name, contact, email, lead_time_days, status[m
[31m-stores	store_id, store_name, city, region, status[m
[31m-users	user_id, role_id, account_status[m
[31m-product_suppliers	product_id, supplier_id, supplier_sku, supplier_cost[m
[31m-[m
[31m-Transactional data[m
[31m-Table	Main fields[m
[31m-sales_orders	order_id, order_date, customer_id, store_id, channel, order_status[m
[31m-sales_order_items	order_id, line_no, product_id, quantity, unit_price, discount, tax, cost_snapshot[m
[31m-purchase_orders	po_id, supplier_id, order_date, expected_date, status[m
[31m-purchase_order_items	po_id, line_no, product_id, ordered_qty, unit_cost[m
[31m-goods_receipts	receipt_id, po_id, received_date, status[m
[31m-goods_receipt_items	receipt_id, line_no, po_line_no, received_qty, accepted_qty[m
[31m-inventory_balances	store_id, product_id, quantity_on_hand, quantity_reserved[m
[31m-inventory_movements	movement_id, store_id, product_id, movement_type, quantity_change, reference_id[m
[31m-payments	payment_id, order_id, method, amount, status, payment_date[m
[31m-shipments	shipment_id, order_id, carrier, dispatched_at, delivered_at, status[m
[31m-returns	return_id, order_id, return_date, reason, status[m
[31m-return_items	return_id, line_no, order_line_no, returned_qty, condition[m
[31m-refunds	refund_id, return_id, amount, refund_status[m
[31m-[m
[31m-We should also maintain metadata such as created_at, updated_at, version and is_active where appropriate.[m
[31m-[m
[31m-For the portfolio version, Google Sheets will store these records in structured tabs. PostgreSQL will use the same logical relationships with stronger data types, primary keys, foreign keys, indexes and SQL constraints.[m
[31m-Relationship overview[m
[31m-#chatgpt-mermaid-_r_9k9_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-_r_9k9_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_9k9_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_9k9_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-_r_9k9_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-_r_9k9_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-_r_9k9_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-_r_9k9_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-_r_9k9_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-_r_9k9_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-_r_9k9_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-_r_9k9_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_9k9_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_9k9_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-_r_9k9_ p{margin:0;}#chatgpt-mermaid-_r_9k9_ .entityBox{fill:rgb(36, 22, 63);stroke:rgb(120, 73, 209);}#chatgpt-mermaid-_r_9k9_ .relationshipLabelBox{fill:rgb(48, 48, 48);opacity:0.7;background-color:rgb(48, 48, 48);}#chatgpt-mermaid-_r_9k9_ .relationshipLabelBox rect{opacity:0.5;}#chatgpt-mermaid-_r_9k9_ .labelBkg{background-color:rgba(48, 48, 48, 0.5);}#chatgpt-mermaid-_r_9k9_ .edgeLabel{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-_r_9k9_ .edgeLabel .label rect{fill:rgb(0, 0, 0);}#chatgpt-mermaid-_r_9k9_ .edgeLabel .label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-_r_9k9_ .edgeLabel .label{fill:rgb(120, 73, 209);font-size:14px;}#chatgpt-mermaid-_r_9k9_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-_r_9k9_ .edge-pattern-dashed{stroke-dasharray:8,8;}#chatgpt-mermaid-_r_9k9_ .node rect,#chatgpt-mermaid-_r_9k9_ .node circle,#chatgpt-mermaid-_r_9k9_ .node ellipse,#chatgpt-mermaid-_r_9k9_ .node polygon{fill:rgb(36, 22, 63);stroke:rgb(120, 73, 209);stroke-width:1px;}#chatgpt-mermaid-_r_9k9_ .relationshipLine{stroke:rgb(175, 175, 175);stroke-width:1px;fill:none;}#chatgpt-mermaid-_r_9k9_ .marker{fill:none!important;stroke:rgb(175, 175, 175)!important;stroke-width:1;}#chatgpt-mermaid-_r_9k9_ [data-look=neo].labelBkg{background-color:rgba(48, 48, 48, 0.5);}#chatgpt-mermaid-_r_9k9_ .node .neo-node{stroke:rgb(120, 73, 209);}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node rect,#chatgpt-mermaid-_r_9k9_ [data-look="neo"].cluster rect,#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-_r_9k9_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-_r_9k9_-gradient);stroke-width:1px;}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node .neo-line path{stroke:rgb(120, 73, 209);filter:none;}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-_r_9k9_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-_r_9k9_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-_r_9k9_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_9k9_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}CUSTOMERSSALES_ORDERSSTORESSALES_ORDER_ITEMSPRODUCTSSUPPLIERSPURCHASE_ORDERSPURCHASE_ORDER_ITEMSGOODS_RECEIPTSINVENTORY_MOVEMENTSPAYMENTSSHIPMENTSRETURNSplacesprocessescontainssold_asreceivescontainspurchased_asfulfilled_bytracked_inrecordspaid_bydelivered_bymay_have[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-This is a simplified logical diagram. The full database will have additional relationships, including goods receipt items, supplier-product mappings, return items and audit logs.[m
[31m-[m
[31m-5. HTML portal design and user experience[m
[31m-The portal should be structured as an administrative application, not as one long HTML form.[m
[31m-Superstore Management Portal[m
[31m-Proposed navigation structure[m
[31m-Design concept[m
[31m-[m
[31m-OverviewProductsCustomersInventoryOrdersMonitoring[m
[31m-[m
[31m-Net Sales₹14.85L[m
[31m-[m
[31m-[m
[31m-Gross Profit₹3.12L[m
[31m-[m
[31m-[m
[31m-Orders1,386[m
[31m-[m
[31m-[m
[31m-Active Products428[m
[31m-[m
[31m-[m
[31m-[m
[31m-Illustrative figures, not live data.[m
[31m-[m
[31m-[m
[31m-The actual application will have dedicated pages, searchable tables, structured forms, confirmation messages and role-based access. The preview illustrates the navigation; it is not yet connected to the operational system.[m
[31m-6. Business Intelligence Dashboard[m
[31m-We will develop six reporting pages using Streamlit and Plotly.[m
[31m-Dashboard page	Business indicators	Business decision supported[m
[31m-Executive Overview	Net sales, gross profit, order count, AOV, growth	Evaluate business health[m
[31m-Sales Performance	Daily/monthly revenue, regional sales, category sales, discounts	Identify growth opportunities[m
[31m-Product Profitability	Gross margin, best sellers, low-performing products	Improve product mix and pricing[m
[31m-Customer Intelligence	Repeat purchase rate, customer segments, purchase frequency, customer value	Improve customer retention[m
[31m-Inventory Intelligence	Stock on hand, stockouts, inventory turnover, ageing, reorder alerts	Reduce stock shortages and excess inventory[m
[31m-Operational Monitoring	Successful loads, pipeline failures, validation errors, last refresh time	Ensure reliable data reporting[m
[31m-[m
[31m-KPI calculations[m
[31m-KPI	Formula[m
[31m-Net Sales	Gross sales − discounts − recognised returns[m
[31m-Gross Profit	Net Sales − Cost of Goods Sold[m
[31m-Gross Margin	Gross Profit / Net Sales × 100[m
[31m-Average Order Value	Net Sales / Number of completed orders[m
[31m-Sales Growth	(Current period sales − Previous period sales) / Previous period sales × 100[m
[31m-Inventory Turnover	Cost of Goods Sold / Average inventory value[m
[31m-Return Rate	Returned units / Sold units × 100[m
[31m-Stock Availability	Available quantity = On-hand quantity − Reserved quantity[m
[31m-[m
[31m-For accurate analytics, the reporting layer must establish consistent definitions of completed sales, recognised returns, tax treatment and cost of goods sold. Historical cost snapshots are especially important for calculating profit correctly.[m
[31m-7. Google Sheets and HTML connectivity[m
[31m-Our implementation will use Google Apps Script HTML Service, which supports browser-based web applications that can be shared through a URL. The app can serve HTML and run server-side functions to update Google Sheets. [m
[31m-Google for Developers+1[m
[31m-[m
[31m-[m
[31m-The operational flow will be:[m
[31m-1. A staff member opens the deployed HTML portal.[m
[31m-2. The user selects Product Registration, Customer Registration or another permitted module.[m
[31m-3. The form validates required fields and data types.[m
[31m-4. Apps Script performs server-side checks, creates a unique record ID and writes the record to the appropriate sheet.[m
[31m-5. The portal displays a success response and updated information.[m
[31m-6. Python later synchronises changes into PostgreSQL for reporting.[m
[31m-We will prevent direct manipulation of spreadsheet rows by normal portal users. Authentication and authorisation will be designed around the deployment model; merely hiding an administrative control in HTML is not sufficient security.[m
[31m-8. GitHub Actions and Airflow failover design[m
[31m-Your requirement is particularly valuable: GitHub Actions should run first, and Airflow should take over only when the primary reporting job fails or misses its deadline.[m
[31m-[m
[31m-To make that reliable, both systems must use the same shared Python pipeline and reporting database.[m
[31m-Daily reporting deadline[m
[31m-GitHub Actions starts the primary run[m
[31m-[m
[31m-Airflow independently checks the expected reporting run[m
[31m-Reads shared PostgreSQL execution metadata[m
[31m-[m
[31m-Completed[m
[31m-Airflow skips backup execution[m
[31m-[m
[31m-Missing / Failed[m
[31m-Airflow attempts recovery[m
[31m-[m
[31m-[m
[31m-[m
[31m-PostgreSQL reconciles execution state[m
[31m-Idempotent loads, locking, monitoring and alerts[m
[31m-[m
[31m-For example, both orchestrators will identify the same reporting period using a key such as sales_daily_2026-11-03. Database-enforced coordination will prevent multiple workers from claiming the same job at once.[m
[31m-[m
[31m-Airflow will consider the primary run unsuccessful only after the configured deadline or an explicit terminal failure. A running but delayed job should not automatically trigger a competing load.[m
[31m-[m
[31m-The full system will also include retries, backfilling for missed periods, row-count reconciliation, data-freshness monitoring and duplicate prevention.[m
[31m-[m
[31m-Infrastructure requirement: Airflow must run on a continuously available service independent of GitHub Actions. This design provides scheduler redundancy, not protection against every possible outage.[m
[31m-9. Project repository structure[m
[31m-superstore-retail-bi-system/[m
[31m-│[m
[31m-├── apps-script/[m
[31m-│   ├── Code.gs[m
[31m-│   ├── Products.gs[m
[31m-│   ├── Customers.gs[m
[31m-│   ├── Sales.gs[m
[31m-│   ├── Inventory.gs[m
[31m-│   ├── Validation.gs[m
[31m-│   └── Index.html[m
[31m-│[m
[31m-├── frontend/[m
[31m-│   ├── styles/[m
[31m-│   ├── scripts/[m
[31m-│   └── components/[m
[31m-│[m
[31m-├── etl/[m
[31m-│   ├── extract.py[m
[31m-│   ├── transform.py[m
[31m-│   ├── validate.py[m
[31m-│   ├── load.py[m
[31m-│   ├── pipeline.py[m
[31m-│   └── failover.py[m
[31m-│[m
[31m-├── database/[m
[31m-│   ├── schema.sql[m
[31m-│   ├── constraints.sql[m
[31m-│   ├── indexes.sql[m
[31m-│   └── reporting_views.sql[m
[31m-│[m
[31m-├── airflow/[m
[31m-│   └── dags/[m
[31m-│       └── superstore_backup_dag.py[m
[31m-│[m
[31m-├── .github/[m
[31m-│   └── workflows/[m
[31m-│       ├── primary_etl.yml[m
[31m-│       └── ci_tests.yml[m
[31m-│[m
[31m-├── dashboard/[m
[31m-│   ├── app.py[m
[31m-│   ├── pages/[m
[31m-│   │   ├── sales.py[m
[31m-│   │   ├── customers.py[m
[31m-│   │   ├── products.py[m
[31m-│   │   ├── inventory.py[m
[31m-│   │   └── pipeline_monitor.py[m
[31m-│   └── queries/[m
[31m-│[m
[31m-├── tests/[m
[31m-│   ├── test_validation.py[m
[31m-│   ├── test_etl.py[m
[31m-│   ├── test_inventory.py[m
[31m-│   ├── test_orders.py[m
[31m-│   └── test_failover.py[m
[31m-│[m
[31m-├── sample_data/[m
[31m-├── docs/[m
[31m-│   ├── architecture.md[m
[31m-│   ├── data_dictionary.md[m
[31m-│   ├── business_rules.md[m
[31m-│   └── screenshots/[m
[31m-│[m
[31m-├── docker-compose.yml[m
[31m-├── requirements.txt[m
[31m-├── .env.example[m
[31m-├── .gitignore[m
[31m-└── README.md[m
[31m-[m
[31m-[m
[31m-10. Development roadmap[m
[31m-I recommend building the project in manageable releases so that we have a working application before introducing more complex functionality.[m
[31m-Phase 1[m
[31m-[m
[31m-Data architecture[m
[31m-[m
[31m-Finalise entities, fields, data types, IDs, relationships, business rules and Google Sheets tabs.[m
[31m-[m
[31m-[m
[31m-Phase 2[m
[31m-[m
[31m-Master-data portal[m
[31m-[m
[31m-Build connected product, category, supplier and customer management forms with create, search, edit and deactivate functions.[m
[31m-[m
[31m-[m
[31m-Phase 3[m
[31m-[m
[31m-Operational transactions[m
[31m-[m
[31m-Implement purchase orders, goods receipts, stock movements, sales orders, payments and returns.[m
[31m-[m
[31m-[m
[31m-Phase 4[m
[31m-[m
[31m-Python ETL and PostgreSQL[m
[31m-[m
[31m-Build extraction, validation, incremental loading, schema constraints, change detection and reconciliation.[m
[31m-[m
[31m-[m
[31m-Phase 5[m
[31m-[m
[31m-Primary GitHub automation[m
[31m-[m
[31m-Configure daily GitHub Actions execution, logging, retries and secure credentials.[m
[31m-[m
[31m-[m
[31m-Phase 6[m
[31m-[m
[31m-Airflow backup and failover[m
[31m-[m
[31m-Deploy Airflow independently and test missed runs, failures, overlapping executions and automatic recovery.[m
[31m-[m
[31m-[m
[31m-Phase 7[m
[31m-[m
[31m-Business Intelligence dashboard[m
[31m-[m
[31m-Implement executive, sales, customer, product, inventory and operational monitoring dashboards.[m
[31m-[m
[31m-[m
[31m-Phase 8[m
[31m-[m
[31m-Testing and portfolio deployment[m
[31m-[m
[31m-Run end-to-end tests, publish documentation, architecture diagram, screenshots and accessible demonstration links.[m
[31m-[m
[31m-[m
[31m-[m
[31m-11. Testing and success criteria[m
[31m-For the project to be convincing to recruiters, it must demonstrate reliable behaviour rather than only attractive forms and charts.[m
[31m-Test scenario	Expected result[m
[31m-Register a valid product	New product appears in Google Sheets[m
[31m-Register a duplicate SKU	Submission is rejected[m
[31m-Edit an existing product price	New price saved without altering previous order values[m
[31m-Record receipt of purchased goods	Inventory increases with a movement record[m
[31m-Sell more units than available	Sale is rejected or an approved backorder is created[m
[31m-Submit a valid order	Order and line items are linked correctly[m
[31m-Run ETL twice for the same period	No duplicated analytical records[m
[31m-GitHub Actions succeeds	Airflow skips backup[m
[31m-GitHub Actions fails	Airflow attempts recovery after the deadline[m
[31m-Both schedulers start concurrently	Only one worker acquires the relevant execution lock[m
[31m-Invalid source data is detected	Validation records the error and prevents corrupted loads[m
[31m-Dashboard loads successfully	KPIs match verified PostgreSQL reporting queries[m
[31m-[m
[31m-We can populate the prototype with realistic synthetic data: products, customers, suppliers, stores, orders, returns and stock movements, including controlled scenarios for testing the failover logic. The README must clearly distinguish synthetic business data from real operational records.[m
[31m-12. What this project will demonstrate on your CV[m
[31m-This project would provide tangible evidence of the following competencies:[m
[31m-[m
[31m-Retail and Business Analysis: Requirements analysis, retail KPI design, product and customer data modelling, operational processes and dashboard reporting.[m
[31m-[m
[31m-Data Engineering: Python ETL, relational SQL, PostgreSQL, data validation, incremental loading, orchestration, logging and recovery.[m
[31m-[m
[31m-Automation: GitHub Actions, Apache Airflow, scheduling, idempotency, execution coordination and failure alerts.[m
[31m-[m
[31m-Application Development: HTML, CSS, JavaScript, Google Apps Script, browser-based forms, CRUD workflows and user permissions.[m
[31m-[m
[31m-Business Intelligence: Streamlit, Plotly, financial metrics, sales trends, customer analysis and inventory performance.[m
[31m-Portfolio-ready project description[m
[31m-Intelligent Superstore Retail Management & Automated BI Reporting System[m
[31m-[m
[31m-Designed and developed an end-to-end retail data-management and business intelligence solution integrating a custom HTML/JavaScript management portal, Google Apps Script, Google Sheets, Python, PostgreSQL and Streamlit. The system supports structured product and customer master data, supplier purchasing, sales transactions, inventory management and automated analytics.[m
[31m-[m
[31m-Implemented a dual-orchestration architecture using GitHub Actions as the primary ETL scheduler and Apache Airflow for independent backup execution and failure recovery. The solution incorporates data validation, incremental loading, execution monitoring, audit trails and interactive dashboards for sales, profitability, customer behaviour and inventory analysis.[m
[31m-[m
[31m-[m
[31m-[m
[31m-[m
[31m-This is a proposed portfolio description. It should be used as a completed-project statement only after the features have been implemented and verified.[m
[31m-[m
[31m-Final recommendation[m
[31m-We should treat the project as two connected applications:[m
[31m-1. Superstore Management Portal: An operational system for users to register products, manage customers, purchase stock, process orders and maintain retail records using HTML, Google Apps Script and Google Sheets.[m
[31m-2. Automated Superstore BI Platform: An analytics engineering system that synchronises this operational data into PostgreSQL and produces dashboards through GitHub Actions, Airflow, Python and Streamlit.[m
[31m-This is more meaningful than a dashboard built from a static CSV because it demonstrates the complete data lifecycle, from transaction creation to automated reporting.[m
[31m-[m
[31m-Our first implementation should be Phase 1: Superstore Database Design and Data Dictionary. We will finalise the required Google Sheets tabs, column names, data types, unique IDs, relationships, validation rules and sample records before writing the connected HTML forms. This will give the rest of the project a reliable foundation.[m
[32m+[m[32mCode and local demo data are included; cloud accounts, credentials, live deployment and real-user authorization checks require your environment. Inventory turnover/lot ageing, draft-order reservations and approval/cancellation workflows are extensions beyond the implemented counter-sale workflow. The Sheets journal rewrites snapshots and is intended for portfolio-scale datasets. Payment/refund entries record staff-confirmed settlements; no payment gateway is connected.[m
