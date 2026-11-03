import csv
import json
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


def extract(settings):
    if settings.source == 'csv':
        return extract_csv(settings.csv_dir)
    if settings.source == 'sheets':
        return extract_sheets(settings)
    raise ValueError('ETL_SOURCE must be csv or sheets')
