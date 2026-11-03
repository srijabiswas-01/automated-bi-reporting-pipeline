import unittest
from etl.config import ROOT
from etl.extract import extract_csv
from etl.transform import transform
from etl.validate import validate


class ProductTests(unittest.TestCase):
    def test_duplicate_sku_rejected(self):
        data,_=transform(extract_csv(ROOT/'sample_data'))
        duplicate=dict(data['products'][0],product_id='OTHER')
        data['products'].append(duplicate)
        self.assertTrue(any(e['rule']=='unique' for e in validate(data)))

    def test_negative_price_rejected(self):
        data,_=transform(extract_csv(ROOT/'sample_data'))
        data['products'][0]['selling_price']=-1
        self.assertTrue(any(e['rule']=='check' for e in validate(data)))
