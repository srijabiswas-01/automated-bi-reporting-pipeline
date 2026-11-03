"""Export the explicitly synthetic SQL fixture to complete CSV source snapshots."""
import csv
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from database.model import TABLES, METADATA
from etl.extract import SOURCE_TABLES


def build():
    connection = sqlite3.connect(':memory:')
    connection.row_factory = sqlite3.Row
    for table in SOURCE_TABLES:
        columns = [f'"{n}" TEXT' for n, _, _ in TABLES[table]]
        columns += ["created_at TEXT DEFAULT '2026-11-03T10:00:00Z'", "updated_at TEXT DEFAULT '2026-11-03T10:00:00Z'", 'version INTEGER DEFAULT 1', 'is_active BOOLEAN DEFAULT 1']
        connection.execute(f'CREATE TABLE {table} (' + ','.join(columns) + ')')
    sql = (ROOT / 'sample_data/seed.sql').read_text(encoding='utf-8')
    sql = sql.replace('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;', '')
    connection.executescript(sql)
    for table in SOURCE_TABLES:
        columns = TABLES[table] + METADATA
        with (ROOT / 'sample_data' / f'{table}.csv').open('w', encoding='utf-8', newline='') as handle:
            writer = csv.writer(handle)
            writer.writerow([n for n, _, _ in columns])
            for row in connection.execute(f'SELECT * FROM {table}'):
                values = []
                for n, kind, _ in columns:
                    value = row[n]
                    if kind == 'boolean' and value is not None:
                        value = 'true' if str(value) in ('1', 'True', 'true') else 'false'
                    values.append('' if value is None else value)
                writer.writerow(values)
    connection.close()
    print(f'Exported {len(SOURCE_TABLES)} synthetic source tables')


if __name__ == '__main__':
    build()
