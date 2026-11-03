import os
import unittest
from unittest.mock import patch
from streamlit.testing.v1 import AppTest


class DashboardTests(unittest.TestCase):
    def test_overview_and_all_reporting_pages_render(self):
        with patch.dict(os.environ,{'DASHBOARD_DEMO':'true'}):
            overview=AppTest.from_file('dashboard/app.py',default_timeout=30).run()
            self.assertEqual(list(overview.exception),[])
            self.assertEqual(overview.metric[0].value,'₹270.00')
            for page in ('sales','products','customers','inventory','pipeline_monitor'):
                with self.subTest(page=page):
                    app=AppTest.from_string(f'from dashboard.pages.{page} import render\nrender()',default_timeout=30).run()
                    self.assertEqual(list(app.exception),[])
