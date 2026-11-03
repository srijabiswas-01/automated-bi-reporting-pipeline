import unittest
from etl.config import ROOT
from etl.extract import extract_csv
from etl.transform import transform
from etl.validate import validate


class InventoryTests(unittest.TestCase):
    def test_negative_stock_and_unbalanced_ledger_rejected(self):
        data,_=transform(extract_csv(ROOT/'sample_data'))
        data['inventory_balances'][0]['quantity_on_hand']=-1
        rules={e['rule'] for e in validate(data)}
        self.assertTrue({'check','ledger_reconciliation'} <= rules)

    def test_over_receipt_rejected(self):
        data,_=transform(extract_csv(ROOT/'sample_data'))
        data['goods_receipt_items'][0]['received_qty']=11
        self.assertTrue(any(e['rule']=='over_receipt' for e in validate(data)))
