import unittest
from etl.config import ROOT
from etl.extract import extract_csv
from etl.transform import transform
from etl.validate import validate


class CustomerTests(unittest.TestCase):
    def test_unknown_segment_and_missing_name_rejected(self):
        data,_=transform(extract_csv(ROOT/'sample_data'))
        data['customers'][0].update(segment_id='missing',full_name='')
        rules={e['rule'] for e in validate(data)}
        self.assertTrue({'foreign_key','required'} <= rules)
