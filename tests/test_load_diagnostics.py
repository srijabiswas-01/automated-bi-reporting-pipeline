from types import SimpleNamespace
import unittest
from etl.load import safe_database_error
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from sqlalchemy import MetaData, Table, Column, String, Integer, DateTime
from etl.load import load


class LoadDiagnosticTests(unittest.TestCase):
    def test_only_error_codes_and_identifiers_are_reported(self):
        error=RuntimeError('password=private-data customer@example.invalid')
        error.orig=SimpleNamespace(sqlstate='23514',diag=SimpleNamespace(constraint_name='products_selling_price_check',column_name='selling_price'))
        message=safe_database_error(error)
        self.assertIn('23514',message)
        self.assertIn('products_selling_price_check',message)
        self.assertNotIn('private-data',message)
        self.assertNotIn('customer',message)

    def test_unspecified_driver_rowcount_does_not_become_negative_load_count(self):
        table=Table('categories',MetaData(),Column('category_id',String,primary_key=True),
                    Column('category_name',String),Column('version',Integer),Column('updated_at',DateTime(timezone=True)))
        rows=[dict(category_id='test',category_name='Synthetic',version=1,updated_at=datetime.now(timezone.utc))]
        for returned,expected in ([('test',)],1),([],0):
            with self.subTest(expected=expected):
                result=MagicMock(rowcount=-1)
                result.fetchall.return_value=returned
                connection=MagicMock()
                connection.execute.side_effect=[MagicMock(),result,MagicMock()]
                with patch('etl.load.Table',return_value=table):
                    self.assertEqual(load(connection,{'categories':rows}),expected)
                self.assertTrue(connection.execute.call_args_list[1].args[0]._returning)
