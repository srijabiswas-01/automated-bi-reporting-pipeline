"""Initialize an empty PostgreSQL/Neon database without Docker or sample records."""
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))

from sqlalchemy import create_engine
from database.model import TABLES
from etl.config import Settings


def initialize(settings):
    engine=create_engine(settings.database_url,future=True,pool_pre_ping=True)
    connection=None
    try:
        connection=engine.raw_connection()
        driver=connection.driver_connection
        driver.autocommit=True
        with driver.cursor() as cursor:
            cursor.execute('SELECT pg_try_advisory_lock(867530950)')
            if not cursor.fetchone()[0]:
                raise RuntimeError('Another schema initializer is active')
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
            existing={row[0] for row in cursor.fetchall()}
            if existing:
                cursor.execute("SELECT viewname FROM pg_views WHERE schemaname='public'")
                views={row[0] for row in cursor.fetchall()}
                expected_views={'reporting_sales_lines','reporting_daily_sales','reporting_inventory','reporting_stock_reconciliation','reporting_customers'}
                if set(TABLES)<=existing and expected_views<=views:
                    print('Schema already present; no tables or data changed. Apply future migrations separately.')
                    return
                raise RuntimeError('Database is nonempty or partially initialized. Use a new empty Neon database or review migrations; existing data was preserved.')
            for filename in ('schema.sql','constraints.sql','indexes.sql','reporting_views.sql'):
                cursor.execute((ROOT/'database'/filename).read_text(encoding='utf-8'))
                while cursor.nextset():
                    pass
            print('Created 29 tables and 5 reporting views. No synthetic data imported.')
    except Exception as exc:
        # Database exceptions may embed connection details or SQL source values.
        if isinstance(exc,RuntimeError):
            raise
        raise RuntimeError('Database initialization failed. Check the direct Neon URL, TLS, permissions and database state.') from None
    finally:
        if connection is not None:
            try:
                with connection.driver_connection.cursor() as cursor:
                    cursor.execute('ROLLBACK')
                    cursor.execute('SELECT pg_advisory_unlock(867530950)')
            finally:
                # Session settings should not leak into a pooled connection.
                connection.invalidate()
                connection.close()
        engine.dispose()


if __name__=='__main__':
    initialize(Settings.from_env())
