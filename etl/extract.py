import csv
import json
import gzip
from datetime import datetime, timezone, timedelta
from urllib.parse import quote

from database.model import TABLES, METADATA

SOURCE_TABLES = tuple(t for t in TABLES if t not in ('pipeline_runs', 'quality_errors', 'etl_watermarks'))


def extract_csv(directory):
    result = {}
    for table in SOURCE_TABLES:
        path = directory / f'{table}.csv'
        if not path.is_file():
            raise ValueError(f'Missing source table: {path}')
        with path.open(encoding='utf-8-sig', newline='') as handle:
            reader = csv.DictReader(handle)
            expected = [f[0] for f in TABLES[table] + METADATA]
            if reader.fieldnames != expected:
                raise ValueError(f'Header mismatch: {table}')
            result[table] = list(reader)
    return result


def extract_sheets(settings):
    from google.oauth2.service_account import Credentials
    from google.auth.transport.requests import AuthorizedSession
    if not settings.spreadsheet_id or not settings.credentials_json:
        raise ValueError('SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON are required')
    credentials = Credentials.from_service_account_info(json.loads(settings.credentials_json), scopes=[
        'https://www.googleapis.com/auth/spreadsheets.readonly'])
    base = f'https://sheets.googleapis.com/v4/spreadsheets/{quote(settings.spreadsheet_id, safe="")}/values'
    with AuthorizedSession(credentials) as session:
        def read(ranges):
            response = session.get(base + ':batchGet', params=[('ranges', r) for r in ranges] + [
                ('valueRenderOption', 'UNFORMATTED_VALUE'), ('dateTimeRenderOption', 'FORMATTED_STRING')], timeout=60)
            response.raise_for_status()
            return response.json().get('valueRanges', [])
        def marker():
            return [r.get('values', []) for r in read(["'_sync'!A1", "'_journal'!A1"])]
        for _ in range(3):
            before = marker()
            if before[1] and before[1][0][0] in ('BUILDING', 'PREPARED'):
                continue
            values = read([f"'{t}'!A:AZ" for t in SOURCE_TABLES])
            if before != marker():
                continue
            result = {}
            for table, block in zip(SOURCE_TABLES, values, strict=True):
                rows = block.get('values', [])
                expected = [f[0] for f in TABLES[table] + METADATA]
                if not rows or rows[0] != expected:
                    raise ValueError(f'Header mismatch: {table}')
                result[table] = [dict(zip(expected, row + [''] * (len(expected)-len(row)), strict=True))
                                 for row in rows[1:] if any(v != '' for v in row)]
            return result
    raise RuntimeError('Source changed or has a pending journal; retry after portal recovery')


def extract_xlsx(path):
    """Read a private whole-workbook Google Sheets download, including empty tabs."""
    from openpyxl import load_workbook
    if not path.is_file():
        raise ValueError(f'Download your operational Sheet as Microsoft Excel to {path}')
    workbook = load_workbook(path, read_only=True, data_only=False)
    try:
        if '_journal' not in workbook.sheetnames or '_sync' not in workbook.sheetnames:
            raise ValueError('Expected the complete operational workbook, including hidden journal/revision tabs')
        if workbook['_journal']['A1'].value in ('BUILDING', 'PREPARED'):
            raise ValueError('Snapshot contains an unfinished write. Refresh the portal, then download again')
        result = {}
        for table in SOURCE_TABLES:
            if table not in workbook.sheetnames:
                raise ValueError(f'Missing workbook tab: {table}')
            sheet = workbook[table]
            expected = [field[0] for field in TABLES[table] + METADATA]
            headers = [cell.value for cell in next(sheet.iter_rows(min_row=1, max_row=1))]
            while headers and headers[-1] is None:
                headers.pop()
            if headers != expected:
                raise ValueError(f'Header mismatch: {table}')
            rows = []
            for cells in sheet.iter_rows(min_row=2, max_col=len(expected)):
                if all(cell.value is None for cell in cells):
                    continue
                if any(cell.data_type in ('f', 'e') for cell in cells):
                    raise ValueError(f'Formula or Excel error found in operational tab {table}')
                rows.append(dict(zip(expected, [cell.value for cell in cells], strict=True)))
            result[table] = rows
        return result
    finally:
        workbook.close()


def extract(settings):
    if settings.source == 'csv':
        return extract_csv(settings.csv_dir)
    if settings.source == 'sheets':
        return extract_sheets(settings)
    if settings.source == 'xlsx':
        return extract_xlsx(settings.xlsx_path)
    if settings.source == 'snapshot':
        return extract_snapshot(settings.snapshot_path, settings.snapshot_max_age_hours)
    raise ValueError('ETL_SOURCE must be csv, sheets, xlsx or snapshot')


def extract_snapshot(path, max_age_hours=26, now=None):
    if not path.is_file():
        raise ValueError('No operational snapshot found. Run exportSuperstoreNow in the Apps Script editor first')
    if max_age_hours<=0:
        raise ValueError('Snapshot freshness limit must be positive')
    # Bound decompression so a malformed archive cannot exhaust a worker's memory.
    with gzip.open(path,'rb') as handle:
        content=handle.read(25*1024*1024+1)
    if len(content)>25*1024*1024:
        raise ValueError('Operational snapshot exceeds the 25 MB decoded limit')
    snapshot=json.loads(content)
    if snapshot.get('format_version')!=1 or not snapshot.get('source_revision'):
        raise ValueError('Unsupported snapshot format or missing source revision')
    timestamp=datetime.fromisoformat(str(snapshot.get('exported_at','')).replace('Z','+00:00'))
    if timestamp.tzinfo is None:
        raise ValueError('Snapshot export timestamp must include a timezone')
    now=now or datetime.now(timezone.utc)
    if timestamp>now+timedelta(minutes=5) or now-timestamp>timedelta(hours=max_age_hours):
        raise ValueError('Snapshot is stale or future-dated; check the Apps Script export trigger')
    tables=snapshot.get('tables')
    if not isinstance(tables,dict) or set(tables)!=set(SOURCE_TABLES):
        raise ValueError('Snapshot must include all operational tables exactly once')
    for table,rows in tables.items():
        expected={f[0] for f in TABLES[table]+METADATA}
        if not isinstance(rows,list) or any(not isinstance(row,dict) or set(row)-expected for row in rows):
            raise ValueError(f'Unexpected columns or invalid records in snapshot table {table}')
    return {table:tables[table] for table in SOURCE_TABLES}
