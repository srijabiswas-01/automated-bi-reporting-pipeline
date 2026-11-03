from datetime import date, datetime, timezone
import unittest
from etl.pipeline import lock_key, backup_due


class FailoverTests(unittest.TestCase):
    def test_stable_signed_64bit_lock(self):
        self.assertEqual(lock_key('period'),lock_key('period'))
        self.assertNotEqual(lock_key('period'),lock_key('other'))
        self.assertTrue(-(2**63)<=lock_key('period')<2**63)

    def test_backup_obeys_deadline(self):
        period=date(2026,11,3)
        self.assertFalse(backup_due(period,3,datetime(2026,11,3,2,59,tzinfo=timezone.utc)))
        self.assertTrue(backup_due(period,3,datetime(2026,11,3,3,0,tzinfo=timezone.utc)))
