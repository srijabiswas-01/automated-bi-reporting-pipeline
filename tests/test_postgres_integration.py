import os
import unittest
import json
import gzip
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime, timezone
from datetime import date
from dataclasses import replace
from sqlalchemy import create_engine, text
from etl.config import Settings
from etl.pipeline import run, lock_key
from etl.extract import extract_csv, SOURCE_TABLES
from etl.transform import transform
from etl.validate import validate
from etl.config import ROOT


@unittest.skipUnless(os.getenv('TEST_DATABASE_URL'), 'Set TEST_DATABASE_URL for initialized disposable PostgreSQL integration checks')
class PostgreSQLIntegrationTests(unittest.TestCase):
    def test_load_skip_retry_and_lock(self):
        settings=replace(Settings.from_env(), database_url=os.environ['TEST_DATABASE_URL'], source='csv')
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

    def test_z_apps_script_export_to_database_and_integrity(self):
        settings=replace(Settings.from_env(), database_url=os.environ['TEST_DATABASE_URL'], source='snapshot')
        source, errors=transform(extract_csv(ROOT/'sample_data'))
        self.assertEqual(errors, [])
        result=subprocess.run(['node','tests/apps_script_test.cjs'], cwd=ROOT,
                              input=json.dumps(source,default=str), text=True, capture_output=True,
                              env=dict(os.environ,EXPORT_BULK_SNAPSHOT='1'), timeout=60)
        self.assertEqual(result.returncode,0,'Apps Script service scenario failed')
        snapshot=json.loads(next(line.removeprefix('BULK_SNAPSHOT ') for line in result.stdout.splitlines() if line.startswith('BULK_SNAPSHOT ')))
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'snapshot.json.gz'
            with gzip.open(path,'wt',encoding='utf-8') as handle:
                json.dump(dict(format_version=1,source_revision='isolated-test',exported_at=datetime.now(timezone.utc).isoformat(),
                               tables={t:snapshot[t] for t in SOURCE_TABLES}),handle)
            settings=replace(settings,snapshot_path=path)
            outcome=run(settings,date(2099,1,4),force=True)
            self.assertEqual(outcome['status'],'succeeded')
            self.assertGreater(outcome['rows_loaded'],0)
            self.assertEqual(run(settings,date(2099,1,4),force=True)['rows_loaded'],0)
        engine=create_engine(settings.database_url)
        try:
            with engine.connect() as conn:
                actual={t:[dict(r) for r in conn.execute(text(f'SELECT * FROM {t}')).mappings()] for t in SOURCE_TABLES}
                self.assertEqual(validate(actual),[])
                self.assertEqual(len(actual['sales_orders']),len(snapshot['sales_orders']))
                customer=next(r for r in actual['customers'] if r['customer_id']=='CUS-001')
                self.assertEqual(customer['customer_code'],'CUS-0001')
                self.assertEqual(conn.scalar(text('SELECT COUNT(*) FROM reporting_stock_reconciliation WHERE difference<>0')),0)
        finally:
            engine.dispose()
