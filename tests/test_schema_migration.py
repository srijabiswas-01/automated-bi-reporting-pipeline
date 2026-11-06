import unittest
from unittest.mock import MagicMock
from database.model import DISPLAY_CODES
from etl.schema import ensure_display_code_schema


class SchemaMigrationTests(unittest.TestCase):
    def test_existing_schema_needs_no_ddl(self):
        conn=MagicMock()
        columns=MagicMock(); columns.tuples.return_value=[(t,s[0]) for t,s in DISPLAY_CODES.items()]
        indexes=MagicMock(); indexes.tuples.return_value=[(t,f'{t}_{s[0]}_key') for t,s in DISPLAY_CODES.items()]
        conn.execute.side_effect=[columns,indexes]
        ensure_display_code_schema(conn)
        self.assertEqual(conn.execute.call_count,2)

    def test_only_missing_column_and_index_are_created(self):
        conn=MagicMock()
        columns=MagicMock(); columns.tuples.return_value=[(t,s[0]) for t,s in DISPLAY_CODES.items() if t!='customers']
        indexes=MagicMock(); indexes.tuples.return_value=[(t,f'{t}_{s[0]}_key') for t,s in DISPLAY_CODES.items() if t!='customers']
        conn.execute.side_effect=[columns,indexes,MagicMock(),MagicMock()]
        ensure_display_code_schema(conn)
        ddl=[str(c.args[0]) for c in conn.execute.call_args_list[2:]]
        self.assertEqual(len(ddl),2)
        self.assertIn('ALTER TABLE customers',ddl[0])
        self.assertIn('customers_customer_code_key',ddl[1])
