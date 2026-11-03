Complete Project Blueprint: Superstore Retail Management & Automated Business Intelligence System
Full-stack data analytics, retail operations, ETL automation, workflow orchestration and business intelligence

We will develop this as an end-to-end, industry-oriented portfolio project, combining a Superstore Management Portal, Google Sheets data storage, Python ETL, PostgreSQL, GitHub Actions, Apache Airflow and a Streamlit Business Intelligence Dashboard.

The project will demonstrate how a retail organisation can capture operational data, manage products and customers, track transactions, automate reporting, detect pipeline failures and support data-driven decisions.
1. Project overview
Component	Project specification
Project title	Intelligent Superstore Management & Automated BI Reporting System
Industry	Retail and e-commerce
Project type	Full-stack data management and analytics engineering
Data source	Custom HTML forms connected to Google Sheets
Operational storage	Google Sheets via Google Apps Script
Analytical database	PostgreSQL
Data processing	Python, Pandas, SQLAlchemy
Primary automation	GitHub Actions
Backup automation	Apache Airflow
BI dashboard	Streamlit and Plotly
Version control	GitHub
Deployment	Cloud-hosted web application, database and independent Airflow service
Target users	Store administrators, sales staff, inventory managers and business analysts

Project objectives
1. Develop an integrated retail data-management portal for product, customer, supplier, purchase, sales and inventory operations.
2. Implement structured, validated data storage using Google Sheets and Google Apps Script.
3. Develop a Python-based ETL pipeline that extracts, validates, transforms and loads retail data into PostgreSQL.
4. Automate reporting through GitHub Actions, with Apache Airflow providing independent recovery and failover.
5. Build an interactive Superstore BI dashboard to analyse revenue, profitability, customer behaviour, inventory and operational performance.
6. Implement monitoring, auditability, data-quality checks and automated failure notifications.
2. Complete system architecture
Superstore Management Web Portal
HTML + CSS + JavaScriptProduct | Customer | Supplier | Sales | Purchasing | Inventory | Returns


Google Apps Script Web Backend
Authentication, server-side validation, CRUD operations and auditing

Google Sheets Operational Database
Structured master and transaction tables

ETL Orchestration Layer
GitHub Actions
Primary scheduler

Apache Airflow
Backup scheduler




Shared Python ETL Engine
Extraction → Validation → Transformation → Incremental Load

PostgreSQL Analytics Database
Clean relational tables, SQL models, reporting views and pipeline logs

Streamlit Business Intelligence Dashboard
Sales | Profit | Customers | Inventory | Shipping | Pipeline Health

Operational Monitoring and Notifications
Data quality, late loads, failures, alerts and recovery

There are two distinct update processes:
- Operational updates: When staff submit a form, Google Apps Script immediately validates and records the data in Google Sheets.
- Reporting updates: GitHub Actions or Airflow reads new and changed data, processes it and updates PostgreSQL. Streamlit then displays the latest synchronised results.
This separation is important because the sales-entry system should not stop working just because the analytics pipeline is temporarily unavailable.

3. Superstore management modules
We will build the following management functions.

Module 1 — Product Master Management

Create, search, edit and deactivate products. Store unique SKUs, product names, brands, categories, subcategories, GTIN/barcodes where applicable, tax codes, units of measure, costs, selling prices, supplier relationships and product status. Historical product price changes will be preserved.




Module 2 — Customer Relationship Management

Create and maintain customer profiles with unique IDs, individual/business customer type, contact information, address, customer segments and account status. Purchase frequency, customer value and order history will be derived automatically.




Module 3 — Supplier Management

Manage suppliers, contacts, supplier product catalogues, lead times, purchasing terms, supplier status and performance indicators.




Module 4 — Purchasing and Goods Receipt

Create purchase orders, select suppliers and products, capture quantities and negotiated costs, approve purchases, register received goods and distinguish fully received from partially received orders.




Module 5 — Inventory and Stock Control

Monitor stock by product and store, receive stock, record adjustments, process stock transfers, maintain reorder points and generate low-stock alerts. Each stock adjustment will produce an auditable movement record.




Module 6 — Sales and Order Processing

Create sales orders with multiple line items, registered products, quantities, price snapshots, discounts and taxes. Track payment, order and fulfilment status separately to avoid incorrect accounting.




Module 7 — Returns, Refunds and Shipping

Track return requests, reasons, accepted quantities, refund status, restocking decisions, delivery methods, carrier references and dispatch/delivery timestamps.




Module 8 — Analytics and System Administration

Provide sales and profit analytics, customer segmentation, product performance, inventory KPIs, pipeline monitoring, user permissions, change logs and reporting freshness information.




4. Industry-standard data model
We must design the underlying tables before creating the HTML forms. The forms should be generated from business requirements and valid data relationships, not the other way around.
Master data
Table	Main fields
products	product_id, sku, product_name, category_id, brand_id, unit, cost_price, selling_price, tax_code, status
categories	category_id, category_name, parent_category_id
customers	customer_id, customer_type, full_name, email, phone, segment_id, status
customer_addresses	address_id, customer_id, city, state, postal_code, country, address_type
suppliers	supplier_id, supplier_name, contact, email, lead_time_days, status
stores	store_id, store_name, city, region, status
users	user_id, role_id, account_status
product_suppliers	product_id, supplier_id, supplier_sku, supplier_cost

Transactional data
Table	Main fields
sales_orders	order_id, order_date, customer_id, store_id, channel, order_status
sales_order_items	order_id, line_no, product_id, quantity, unit_price, discount, tax, cost_snapshot
purchase_orders	po_id, supplier_id, order_date, expected_date, status
purchase_order_items	po_id, line_no, product_id, ordered_qty, unit_cost
goods_receipts	receipt_id, po_id, received_date, status
goods_receipt_items	receipt_id, line_no, po_line_no, received_qty, accepted_qty
inventory_balances	store_id, product_id, quantity_on_hand, quantity_reserved
inventory_movements	movement_id, store_id, product_id, movement_type, quantity_change, reference_id
payments	payment_id, order_id, method, amount, status, payment_date
shipments	shipment_id, order_id, carrier, dispatched_at, delivered_at, status
returns	return_id, order_id, return_date, reason, status
return_items	return_id, line_no, order_line_no, returned_qty, condition
refunds	refund_id, return_id, amount, refund_status

We should also maintain metadata such as created_at, updated_at, version and is_active where appropriate.

For the portfolio version, Google Sheets will store these records in structured tabs. PostgreSQL will use the same logical relationships with stronger data types, primary keys, foreign keys, indexes and SQL constraints.
Relationship overview
#chatgpt-mermaid-_r_9k9_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-_r_9k9_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_9k9_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_9k9_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-_r_9k9_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-_r_9k9_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-_r_9k9_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-_r_9k9_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-_r_9k9_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-_r_9k9_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-_r_9k9_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-_r_9k9_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_9k9_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_9k9_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-_r_9k9_ p{margin:0;}#chatgpt-mermaid-_r_9k9_ .entityBox{fill:rgb(36, 22, 63);stroke:rgb(120, 73, 209);}#chatgpt-mermaid-_r_9k9_ .relationshipLabelBox{fill:rgb(48, 48, 48);opacity:0.7;background-color:rgb(48, 48, 48);}#chatgpt-mermaid-_r_9k9_ .relationshipLabelBox rect{opacity:0.5;}#chatgpt-mermaid-_r_9k9_ .labelBkg{background-color:rgba(48, 48, 48, 0.5);}#chatgpt-mermaid-_r_9k9_ .edgeLabel{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-_r_9k9_ .edgeLabel .label rect{fill:rgb(0, 0, 0);}#chatgpt-mermaid-_r_9k9_ .edgeLabel .label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-_r_9k9_ .edgeLabel .label{fill:rgb(120, 73, 209);font-size:14px;}#chatgpt-mermaid-_r_9k9_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-_r_9k9_ .edge-pattern-dashed{stroke-dasharray:8,8;}#chatgpt-mermaid-_r_9k9_ .node rect,#chatgpt-mermaid-_r_9k9_ .node circle,#chatgpt-mermaid-_r_9k9_ .node ellipse,#chatgpt-mermaid-_r_9k9_ .node polygon{fill:rgb(36, 22, 63);stroke:rgb(120, 73, 209);stroke-width:1px;}#chatgpt-mermaid-_r_9k9_ .relationshipLine{stroke:rgb(175, 175, 175);stroke-width:1px;fill:none;}#chatgpt-mermaid-_r_9k9_ .marker{fill:none!important;stroke:rgb(175, 175, 175)!important;stroke-width:1;}#chatgpt-mermaid-_r_9k9_ [data-look=neo].labelBkg{background-color:rgba(48, 48, 48, 0.5);}#chatgpt-mermaid-_r_9k9_ .node .neo-node{stroke:rgb(120, 73, 209);}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node rect,#chatgpt-mermaid-_r_9k9_ [data-look="neo"].cluster rect,#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-_r_9k9_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-_r_9k9_-gradient);stroke-width:1px;}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node .neo-line path{stroke:rgb(120, 73, 209);filter:none;}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-_r_9k9_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-_r_9k9_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_9k9_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-_r_9k9_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_9k9_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}CUSTOMERSSALES_ORDERSSTORESSALES_ORDER_ITEMSPRODUCTSSUPPLIERSPURCHASE_ORDERSPURCHASE_ORDER_ITEMSGOODS_RECEIPTSINVENTORY_MOVEMENTSPAYMENTSSHIPMENTSRETURNSplacesprocessescontainssold_asreceivescontainspurchased_asfulfilled_bytracked_inrecordspaid_bydelivered_bymay_have





This is a simplified logical diagram. The full database will have additional relationships, including goods receipt items, supplier-product mappings, return items and audit logs.

5. HTML portal design and user experience
The portal should be structured as an administrative application, not as one long HTML form.
Superstore Management Portal
Proposed navigation structure
Design concept

OverviewProductsCustomersInventoryOrdersMonitoring

Net Sales₹14.85L


Gross Profit₹3.12L


Orders1,386


Active Products428



Illustrative figures, not live data.


The actual application will have dedicated pages, searchable tables, structured forms, confirmation messages and role-based access. The preview illustrates the navigation; it is not yet connected to the operational system.
6. Business Intelligence Dashboard
We will develop six reporting pages using Streamlit and Plotly.
Dashboard page	Business indicators	Business decision supported
Executive Overview	Net sales, gross profit, order count, AOV, growth	Evaluate business health
Sales Performance	Daily/monthly revenue, regional sales, category sales, discounts	Identify growth opportunities
Product Profitability	Gross margin, best sellers, low-performing products	Improve product mix and pricing
Customer Intelligence	Repeat purchase rate, customer segments, purchase frequency, customer value	Improve customer retention
Inventory Intelligence	Stock on hand, stockouts, inventory turnover, ageing, reorder alerts	Reduce stock shortages and excess inventory
Operational Monitoring	Successful loads, pipeline failures, validation errors, last refresh time	Ensure reliable data reporting

KPI calculations
KPI	Formula
Net Sales	Gross sales − discounts − recognised returns
Gross Profit	Net Sales − Cost of Goods Sold
Gross Margin	Gross Profit / Net Sales × 100
Average Order Value	Net Sales / Number of completed orders
Sales Growth	(Current period sales − Previous period sales) / Previous period sales × 100
Inventory Turnover	Cost of Goods Sold / Average inventory value
Return Rate	Returned units / Sold units × 100
Stock Availability	Available quantity = On-hand quantity − Reserved quantity

For accurate analytics, the reporting layer must establish consistent definitions of completed sales, recognised returns, tax treatment and cost of goods sold. Historical cost snapshots are especially important for calculating profit correctly.
7. Google Sheets and HTML connectivity
Our implementation will use Google Apps Script HTML Service, which supports browser-based web applications that can be shared through a URL. The app can serve HTML and run server-side functions to update Google Sheets. 
Google for Developers+1


The operational flow will be:
1. A staff member opens the deployed HTML portal.
2. The user selects Product Registration, Customer Registration or another permitted module.
3. The form validates required fields and data types.
4. Apps Script performs server-side checks, creates a unique record ID and writes the record to the appropriate sheet.
5. The portal displays a success response and updated information.
6. Python later synchronises changes into PostgreSQL for reporting.
We will prevent direct manipulation of spreadsheet rows by normal portal users. Authentication and authorisation will be designed around the deployment model; merely hiding an administrative control in HTML is not sufficient security.
8. GitHub Actions and Airflow failover design
Your requirement is particularly valuable: GitHub Actions should run first, and Airflow should take over only when the primary reporting job fails or misses its deadline.

To make that reliable, both systems must use the same shared Python pipeline and reporting database.
Daily reporting deadline
GitHub Actions starts the primary run

Airflow independently checks the expected reporting run
Reads shared PostgreSQL execution metadata

Completed
Airflow skips backup execution

Missing / Failed
Airflow attempts recovery



PostgreSQL reconciles execution state
Idempotent loads, locking, monitoring and alerts

For example, both orchestrators will identify the same reporting period using a key such as sales_daily_2026-11-03. Database-enforced coordination will prevent multiple workers from claiming the same job at once.

Airflow will consider the primary run unsuccessful only after the configured deadline or an explicit terminal failure. A running but delayed job should not automatically trigger a competing load.

The full system will also include retries, backfilling for missed periods, row-count reconciliation, data-freshness monitoring and duplicate prevention.

Infrastructure requirement: Airflow must run on a continuously available service independent of GitHub Actions. This design provides scheduler redundancy, not protection against every possible outage.
9. Project repository structure
superstore-retail-bi-system/
│
├── apps-script/
│   ├── Code.gs
│   ├── Products.gs
│   ├── Customers.gs
│   ├── Sales.gs
│   ├── Inventory.gs
│   ├── Validation.gs
│   └── Index.html
│
├── frontend/
│   ├── styles/
│   ├── scripts/
│   └── components/
│
├── etl/
│   ├── extract.py
│   ├── transform.py
│   ├── validate.py
│   ├── load.py
│   ├── pipeline.py
│   └── failover.py
│
├── database/
│   ├── schema.sql
│   ├── constraints.sql
│   ├── indexes.sql
│   └── reporting_views.sql
│
├── airflow/
│   └── dags/
│       └── superstore_backup_dag.py
│
├── .github/
│   └── workflows/
│       ├── primary_etl.yml
│       └── ci_tests.yml
│
├── dashboard/
│   ├── app.py
│   ├── pages/
│   │   ├── sales.py
│   │   ├── customers.py
│   │   ├── products.py
│   │   ├── inventory.py
│   │   └── pipeline_monitor.py
│   └── queries/
│
├── tests/
│   ├── test_validation.py
│   ├── test_etl.py
│   ├── test_inventory.py
│   ├── test_orders.py
│   └── test_failover.py
│
├── sample_data/
├── docs/
│   ├── architecture.md
│   ├── data_dictionary.md
│   ├── business_rules.md
│   └── screenshots/
│
├── docker-compose.yml
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md


10. Development roadmap
I recommend building the project in manageable releases so that we have a working application before introducing more complex functionality.
Phase 1

Data architecture

Finalise entities, fields, data types, IDs, relationships, business rules and Google Sheets tabs.


Phase 2

Master-data portal

Build connected product, category, supplier and customer management forms with create, search, edit and deactivate functions.


Phase 3

Operational transactions

Implement purchase orders, goods receipts, stock movements, sales orders, payments and returns.


Phase 4

Python ETL and PostgreSQL

Build extraction, validation, incremental loading, schema constraints, change detection and reconciliation.


Phase 5

Primary GitHub automation

Configure daily GitHub Actions execution, logging, retries and secure credentials.


Phase 6

Airflow backup and failover

Deploy Airflow independently and test missed runs, failures, overlapping executions and automatic recovery.


Phase 7

Business Intelligence dashboard

Implement executive, sales, customer, product, inventory and operational monitoring dashboards.


Phase 8

Testing and portfolio deployment

Run end-to-end tests, publish documentation, architecture diagram, screenshots and accessible demonstration links.



11. Testing and success criteria
For the project to be convincing to recruiters, it must demonstrate reliable behaviour rather than only attractive forms and charts.
Test scenario	Expected result
Register a valid product	New product appears in Google Sheets
Register a duplicate SKU	Submission is rejected
Edit an existing product price	New price saved without altering previous order values
Record receipt of purchased goods	Inventory increases with a movement record
Sell more units than available	Sale is rejected or an approved backorder is created
Submit a valid order	Order and line items are linked correctly
Run ETL twice for the same period	No duplicated analytical records
GitHub Actions succeeds	Airflow skips backup
GitHub Actions fails	Airflow attempts recovery after the deadline
Both schedulers start concurrently	Only one worker acquires the relevant execution lock
Invalid source data is detected	Validation records the error and prevents corrupted loads
Dashboard loads successfully	KPIs match verified PostgreSQL reporting queries

We can populate the prototype with realistic synthetic data: products, customers, suppliers, stores, orders, returns and stock movements, including controlled scenarios for testing the failover logic. The README must clearly distinguish synthetic business data from real operational records.
12. What this project will demonstrate on your CV
This project would provide tangible evidence of the following competencies:

Retail and Business Analysis: Requirements analysis, retail KPI design, product and customer data modelling, operational processes and dashboard reporting.

Data Engineering: Python ETL, relational SQL, PostgreSQL, data validation, incremental loading, orchestration, logging and recovery.

Automation: GitHub Actions, Apache Airflow, scheduling, idempotency, execution coordination and failure alerts.

Application Development: HTML, CSS, JavaScript, Google Apps Script, browser-based forms, CRUD workflows and user permissions.

Business Intelligence: Streamlit, Plotly, financial metrics, sales trends, customer analysis and inventory performance.
Portfolio-ready project description
Intelligent Superstore Retail Management & Automated BI Reporting System

Designed and developed an end-to-end retail data-management and business intelligence solution integrating a custom HTML/JavaScript management portal, Google Apps Script, Google Sheets, Python, PostgreSQL and Streamlit. The system supports structured product and customer master data, supplier purchasing, sales transactions, inventory management and automated analytics.

Implemented a dual-orchestration architecture using GitHub Actions as the primary ETL scheduler and Apache Airflow for independent backup execution and failure recovery. The solution incorporates data validation, incremental loading, execution monitoring, audit trails and interactive dashboards for sales, profitability, customer behaviour and inventory analysis.




This is a proposed portfolio description. It should be used as a completed-project statement only after the features have been implemented and verified.

Final recommendation
We should treat the project as two connected applications:
1. Superstore Management Portal: An operational system for users to register products, manage customers, purchase stock, process orders and maintain retail records using HTML, Google Apps Script and Google Sheets.
2. Automated Superstore BI Platform: An analytics engineering system that synchronises this operational data into PostgreSQL and produces dashboards through GitHub Actions, Airflow, Python and Streamlit.
This is more meaningful than a dashboard built from a static CSV because it demonstrates the complete data lifecycle, from transaction creation to automated reporting.

Our first implementation should be Phase 1: Superstore Database Design and Data Dictionary. We will finalise the required Google Sheets tabs, column names, data types, unique IDs, relationships, validation rules and sample records before writing the connected HTML forms. This will give the rest of the project a reliable foundation.
