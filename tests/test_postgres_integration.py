import os
import unittest
from datetime import date
from sqlalchemy import create_engine, text
from etl.config import Settings
from etl.pipeline import run, lock_key


@unittest.skipUnless(os.getenv('DATABASE_URL'), 'Set DATABASE_URL for initialized disposable PostgreSQL integration checks')
class PostgreSQLIntegrationTests(unittest.TestCase):
    def test_load_skip_retry_and_lock(self):
        settings=Settings.from_env()
        period=date(2099,1,2)
        engine=create_engine(settings.database_url)
        try:
            with engine.begin() as conn:
                conn.execute(text("DELETE FROM quality_errors WHERE run_id IN (SELECT run_id FROM pipeline_runs WHERE period_key='sales_daily_2099-01-02')"))
                conn.execute(text("DELETE FROM pipeline_runs WHERE period_key='sales_daily_2099-01-02'"))
            first=run(settings,period)
            self.assertEqual(first['status'],'succeeded')
            self.assertEqual(run(settings,period)['status'],'skipped')
            self.assertEqual(run(settings,period,force=True)['rows_loaded'],0)
            with engine.connect() as owner:
                key=lock_key('superstore_shared_analytics_writer')
                owner.execute(text('SELECT pg_advisory_lock(:key)'),{'key':key})
                owner.commit()
                try:
                    self.assertEqual(run(settings,date(2099,1,3))['reason'],'another worker owns the load')
                finally:
                    owner.execute(text('SELECT pg_advisory_unlock(:key)'),{'key':key})
                    owner.commit()
            with engine.connect() as conn:
                self.assertEqual(conn.scalar(text('SELECT net_sales FROM reporting_daily_sales')),270)
                self.assertEqual(conn.scalar(text('SELECT COUNT(*) FROM sales_orders')),1)
        finally:
            engine.dispose()
