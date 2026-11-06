import os
import unittest
from unittest.mock import patch
from pathlib import Path
from etl.pipeline import lock_key, run
from etl.config import Settings


class PipelineControlTests(unittest.TestCase):
    def test_stable_signed_64bit_writer_lock(self):
        self.assertEqual(lock_key('period'),lock_key('period'))
        self.assertNotEqual(lock_key('period'),lock_key('other'))
        self.assertTrue(-(2**63)<=lock_key('period')<2**63)

    def test_unknown_scheduler_rejected_before_database_access(self):
        with self.assertRaises(ValueError):
            run(None,None,orchestrator='unknown')

    def test_snapshot_configuration_keeps_paths_and_freshness(self):
        values={'DATABASE_URL':'postgresql://test:placeholder@localhost/test', 'ETL_SOURCE':'snapshot',
                'SNAPSHOT_PATH':'operational/custom.json.gz', 'SNAPSHOT_MAX_AGE_HOURS':'12',
                'XLSX_PATH':'sample_data/custom.xlsx'}
        with patch.dict(os.environ,values):
            settings=Settings.from_env()
        self.assertEqual(settings.source,'snapshot')
        self.assertEqual(settings.snapshot_path,Path('operational/custom.json.gz'))
        self.assertEqual(settings.snapshot_max_age_hours,12)
        self.assertEqual(settings.xlsx_path,Path('sample_data/custom.xlsx'))
        self.assertTrue(settings.database_url.startswith('postgresql+psycopg://'))
