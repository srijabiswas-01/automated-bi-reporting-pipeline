import os
import unittest
from unittest.mock import patch
from streamlit.testing.v1 import AppTest
from dashboard.common import demo_mode


class DashboardTests(unittest.TestCase):
    def test_database_mode_is_read_from_env_file_before_database_access(self):
        with patch.dict(os.environ,{},clear=True), patch('dashboard.common.dotenv_values',return_value={'DASHBOARD_DEMO':'false'}):
            self.assertFalse(demo_mode())

    def test_explicit_process_demo_setting_overrides_env_file(self):
        with patch.dict(os.environ,{'DASHBOARD_DEMO':'true'}), patch('dashboard.common.dotenv_values',return_value={'DASHBOARD_DEMO':'false'}):
            self.assertTrue(demo_mode())

    def test_overview_and_all_reporting_pages_render(self):
        with patch.dict(os.environ,{'DASHBOARD_DEMO':'true'}):
            overview=AppTest.from_file('dashboard/app.py',default_timeout=30).run()
            self.assertEqual(list(overview.exception),[])
            self.assertEqual(overview.metric[0].value,'₹270.00')
            for page in ('sales','products','customers','inventory','pipeline_monitor'):
                with self.subTest(page=page):
                    app=AppTest.from_string(f'from dashboard.pages.{page} import render\nrender()',default_timeout=30).run()
                    self.assertEqual(list(app.exception),[])
