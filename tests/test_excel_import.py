from pathlib import Path
import tempfile
import unittest
from openpyxl import Workbook
from database.model import TABLES, METADATA
from etl.config import ROOT
from etl.extract import SOURCE_TABLES, extract_csv, extract_xlsx
from etl.transform import transform
from etl.validate import validate


class ExcelImportTests(unittest.TestCase):
    def workbook(self):
        book=Workbook()
        book.active.title='_journal'
        book.create_sheet('_sync')['A1']='synthetic-fixture-revision'
        data=extract_csv(ROOT/'sample_data')
        for table in SOURCE_TABLES:
            sheet=book.create_sheet(table)
            headers=[field[0] for field in TABLES[table]+METADATA]
            sheet.append(headers)
            for row in data[table]:
                sheet.append([row.get(key,'') for key in headers])
        return book

    def test_complete_download_passes_etl_validation(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'export.xlsx'
            self.workbook().save(path)
            data,errors=transform(extract_xlsx(path))
            self.assertEqual(errors,[])
            self.assertEqual(validate(data),[])
            self.assertEqual(data['products'][0]['sku'],'PAPER-A4')

    def test_pending_journal_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'export.xlsx'
            book=self.workbook()
            book['_journal']['A1']='PREPARED'
            book.save(path)
            with self.assertRaisesRegex(ValueError,'unfinished write'):
                extract_xlsx(path)

    def test_missing_tab_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'export.xlsx'
            book=self.workbook()
            del book['products']
            book.save(path)
            with self.assertRaisesRegex(ValueError,'Missing workbook tab: products'):
                extract_xlsx(path)

    def test_formula_is_not_evaluated_or_loaded(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'export.xlsx'
            book=self.workbook()
            book['products']['C2']='=1+1'
            book.save(path)
            with self.assertRaisesRegex(ValueError,'Formula or Excel error'):
                extract_xlsx(path)
