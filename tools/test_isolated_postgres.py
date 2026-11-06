"""Exercise PostgreSQL writes in a temporary schema, never in business tables.

Run: python -m tools.test_isolated_postgres
Uses DATABASE_URL privately; always removes its own temporary schema.
"""
import os
import re
import subprocess
import sys
import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from etl.config import ROOT, Settings


def main():
    settings = Settings.from_env()
    schema = 'superstore_test_' + uuid.uuid4().hex
    assert re.fullmatch(r'superstore_test_[0-9a-f]{32}', schema)
    engine = create_engine(settings.database_url, connect_args={'connect_timeout': 20})
    created = False
    try:
        with engine.begin() as conn:
            conn.execute(text(f'CREATE SCHEMA "{schema}"'))
        created = True
        print('Temporary schema created; applying fixture schema and constraints', flush=True)
        test_url = make_url(settings.database_url).update_query_dict({'options': '-csearch_path=' + schema})
        isolated = create_engine(test_url)
        try:
            with isolated.connect() as conn:
                assert conn.scalar(text('SELECT current_schema()')) == schema
                conn.rollback()
                for name in ('database/schema.sql', 'database/constraints.sql', 'database/indexes.sql',
                             'database/reporting_views.sql', 'sample_data/seed.sql', 'tests/verify_database.sql'):
                    conn.exec_driver_sql((ROOT / name).read_text(encoding='utf-8'))
                    conn.commit()
            environment = dict(os.environ, DATABASE_URL=test_url.render_as_string(hide_password=False),
                               TEST_DATABASE_URL=test_url.render_as_string(hide_password=False), ETL_SOURCE='csv')
            print('Running isolated Apps Script/export/ETL integration tests', flush=True)
            result = subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests',
                                     '-p', 'test_postgres_integration.py', '-v'], cwd=ROOT, env=environment,
                                    capture_output=True, text=True, timeout=300)
            if result.returncode:
                # No subprocess tracebacks containing private connection strings.
                raise RuntimeError('Isolated PostgreSQL integration test failed')
            print('PASS: schema, constraints, reporting views, fixture checks, versioned load, retry, deduplication and writer lock', flush=True)
        finally:
            isolated.dispose()
    finally:
        if created:
            with engine.begin() as conn:
                conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
            print('Temporary test schema removed; business tables were not written')
        engine.dispose()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('Isolated PostgreSQL check failed: ' + type(exc).__name__)
        sys.exit(1)
