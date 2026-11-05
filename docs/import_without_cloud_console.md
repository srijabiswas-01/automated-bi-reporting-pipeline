# Import Google Sheets without Google Cloud Console

This option uses a downloaded Excel workbook. It needs no service account, API key or Google Cloud project. It synchronizes the saved snapshot only; changes made later in Google Sheets require another download and import.

1. Finish any current portal submissions and avoid edits during the download. Refresh the portal first so interrupted writes are recovered.
2. Open the **Superstore Operational Database** Google Sheet.
3. Choose **File → Download → Microsoft Excel (.xlsx)**. Download the complete workbook, not individual CSV tabs. Hidden recovery and revision tabs must be included.
4. Save or copy it to `sample_data/superstore.xlsx` inside this project. If it downloads as `Superstore Operational Database.xlsx`, rename it to `superstore.xlsx`.
5. Ensure Docker Desktop is running and the PostgreSQL container is healthy.
6. Set these entries in the private .env file, retaining the existing database password and URL:

```dotenv
ETL_SOURCE=xlsx
XLSX_PATH=sample_data/superstore.xlsx
DASHBOARD_DEMO=false
```

7. From the project terminal:

```powershell
pip install -r requirements.txt
python -m etl.pipeline --force
python -m streamlit run dashboard/app.py
```

`--force` rechecks an already completed reporting period. Versioned upserts prevent duplicate records and update newer versions from the workbook. They do not remove records missing from a snapshot. Do not reset source versions or edit this exported workbook; make operational changes through the portal.

The importer requires the exact table headers, validates relationships and reconciles stock before committing a load. Missing tabs, pending recovery journals, formulas and spreadsheet error cells are rejected. Real workbook exports can include customer and account information: keep them private. sample_data/*.xlsx is excluded from Git by this project.

To refresh data later, replace the workbook with a fresh download and rerun `python -m etl.pipeline --force`. Scheduled jobs can process a supplied workbook, but this method does not automatically fetch changes from the live Sheet. Live unattended Google Sheets synchronization still needs an authorized integration.
