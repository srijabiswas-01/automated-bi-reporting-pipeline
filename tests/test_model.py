import csv
import json
import re
import unittest
from pathlib import Path

from database.model import TABLES, METADATA, COMPOSITE_KEYS

ROOT = Path(__file__).resolve().parents[1]


class ModelTests(unittest.TestCase):
    def test_all_references_resolve_in_creation_order(self):
        created = set()
        for table, fields in TABLES.items():
            created.add(table)
            for _, _, rule in fields:
                for target, column in re.findall(r'REFERENCES (\w+)\((\w+)\)', rule):
                    self.assertIn(target, created)
                    self.assertIn(column, [f[0] for f in TABLES[target]])

    def test_every_table_has_a_valid_primary_key(self):
        for table, fields in TABLES.items():
            keys = COMPOSITE_KEYS.get(table)
            if keys:
                self.assertTrue(set(keys.split(', ')) <= {f[0] for f in fields})
            else:
                self.assertEqual(sum('PRIMARY KEY' in f[2] for f in fields), 1)

    def test_manifest_and_sheet_headers_match_model(self):
        manifest = json.loads((ROOT / 'database/sheets_manifest.json').read_text())
        self.assertEqual(set(manifest), set(TABLES))
        for table, fields in TABLES.items():
            expected = [f[0] for f in fields + METADATA]
            self.assertEqual([f['name'] for f in manifest[table]], expected)
            with (ROOT / 'sample_data/sheets' / f'{table}.csv').open(newline='') as handle:
                self.assertEqual(next(csv.reader(handle)), expected)


if __name__ == '__main__':
    unittest.main()
