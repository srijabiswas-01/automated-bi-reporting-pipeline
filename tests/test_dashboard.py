import os
import unittest
from unittest.mock import patch
from pathlib import Path
from streamlit.testing.v1 import AppTest
from dashboard.common import demo_mode, display_records
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]


class DashboardTests(unittest.TestCase):
    def test_display_codes_replace_ids_without_changing_source_or_totals(self):
        source = pd.DataFrame({'customer_id':['internal-uuid'], 'segment_id':['segment-uuid'], 'period_net_sales':[123.45]})
        data = {
            'customers': pd.DataFrame({'customer_id':['internal-uuid'], 'customer_code':['CUS-0001']}),
            'segments': pd.DataFrame({'segment_id':['segment-uuid'], 'segment_code':['SEG-0001']}),
        }
        visible = display_records(source, data)
        self.assertEqual(visible.customer_code.tolist(), ['CUS-0001'])
        self.assertEqual(visible.segment_code.tolist(), ['SEG-0001'])
        self.assertFalse(any(column.endswith('_id') for column in visible))
        self.assertEqual(visible.period_net_sales.sum(), source.period_net_sales.sum())
        self.assertEqual(source.customer_id.tolist(), ['internal-uuid'])
        self.assertNotIn('internal-uuid', visible.to_csv(index=False))

    def test_database_mode_is_read_from_env_file_before_database_access(self):
        with patch.dict(os.environ,{},clear=True), patch('dashboard.common.dotenv_values',return_value={'DASHBOARD_DEMO':'false'}):
            self.assertFalse(demo_mode())

    def test_explicit_process_demo_setting_overrides_env_file(self):
        with patch.dict(os.environ,{'DASHBOARD_DEMO':'true'}), patch('dashboard.common.dotenv_values',return_value={'DASHBOARD_DEMO':'false'}):
            self.assertTrue(demo_mode())

    def test_overview_and_all_reporting_pages_render(self):
        with patch.dict(os.environ,{'DASHBOARD_DEMO':'true'}):
            overview=AppTest.from_file(str(ROOT / 'dashboard/app.py'),default_timeout=30).run()
            self.assertEqual(list(overview.exception),[])
            self.assertEqual(overview.metric[0].value,'₹270.00')
            for page in ('sales','products','customers','inventory','pipeline_monitor'):
                with self.subTest(page=page):
                    app=AppTest.from_string(f'from dashboard.pages.{page} import render\nrender()',default_timeout=30).run()
                    self.assertEqual(list(app.exception),[])
