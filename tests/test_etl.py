import copy
import unittest
from datetime import date, datetime
from decimal import Decimal
from etl.config import ROOT
from etl.extract import extract_csv
from etl.transform import transform, convert
from etl.validate import validate


class ETLTests(unittest.TestCase):
    def setUp(self):
        self.data, errors = transform(extract_csv(ROOT / 'sample_data'))
        self.assertEqual(errors, [])

    def test_complete_synthetic_snapshot_is_valid(self):
        self.assertEqual(validate(self.data), [])

    def test_invalid_foreign_key_is_quarantined(self):
        self.data['sales_orders'][0]['customer_id'] = 'missing'
        self.assertTrue(any(e['rule'] == 'foreign_key' for e in validate(self.data)))

    def test_invalid_numeric_and_naive_timestamp_rejected(self):
        for value, kind in [('NaN','numeric(14,2)'),('1.001','numeric(14,2)'),('1.2','integer'),('2026-11-03T00:00:00','timestamptz')]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                convert(value, kind)

    def test_oversold_returns_rejected(self):
        self.data['return_items'][0]['returned_qty'] = 3
        self.assertTrue(any(e['rule']=='over_return' for e in validate(self.data)))

    def test_historical_cost_and_tax_policy(self):
        from dashboard.common import sales_lines
        import pandas as pd
        frames={t:pd.read_csv(ROOT / 'sample_data' / f'{t}.csv') for t in ('products','sales_orders','sales_order_items','returns','return_items')}
        lines=sales_lines(frames)
        self.assertEqual(lines.net_sales.sum(),270)
        self.assertEqual(lines.gross_profit.sum(),70)

    def test_sheets_dates_preserve_india_calendar_day(self):
        self.assertEqual(convert('2026-08-31T18:30:00.000Z','date'),date(2026,9,1))
        self.assertEqual(convert('2026-11-03T00:00:00.000Z','date'),date(2026,11,3))
        self.assertEqual(convert('2026-11-03','date'),date(2026,11,3))
        self.assertEqual(convert(datetime(2026,11,3),'date'),date(2026,11,3))


if __name__=='__main__':
    unittest.main()
