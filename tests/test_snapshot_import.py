import gzip
import json
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path

from etl.config import ROOT
from etl.extract import extract_csv, extract_snapshot
from etl.transform import transform
from etl.validate import validate


class SnapshotImportTests(unittest.TestCase):
    def setUp(self):
        self.now=datetime.now(timezone.utc)
        self.envelope={'format_version':1,'exported_at':self.now.isoformat(),'source_revision':'test-revision',
                       'tables':extract_csv(ROOT/'sample_data')}

    def read(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'snapshot.json.gz'
            with gzip.open(path,'wt',encoding='utf-8') as handle:
                json.dump(self.envelope,handle)
            return extract_snapshot(path,26,now=self.now)

    def test_complete_snapshot_passes_business_validation(self):
        data,errors=transform(self.read())
        self.assertEqual(errors,[])
        self.assertEqual(validate(data),[])

    def test_stale_and_future_snapshots_rejected(self):
        for hours in (-27,1):
            with self.subTest(hours=hours):
                self.envelope['exported_at']=(self.now+timedelta(hours=hours)).isoformat()
                with self.assertRaisesRegex(ValueError,'stale or future'):
                    self.read()

    def test_missing_table_and_unknown_fields_rejected(self):
        self.envelope['tables']['products'][0]['unexpected']='not allowed'
        with self.assertRaisesRegex(ValueError,'Unexpected columns'):
            self.read()
        del self.envelope['tables']['products']
        with self.assertRaisesRegex(ValueError,'all operational tables'):
            self.read()

    def test_old_format_and_naive_dates_rejected(self):
        self.envelope['format_version']=99
        with self.assertRaisesRegex(ValueError,'Unsupported snapshot'):
            self.read()
        self.envelope['format_version']=1
        self.envelope['exported_at']='2026-11-03T12:00:00'
        with self.assertRaisesRegex(ValueError,'timezone'):
            self.read()
