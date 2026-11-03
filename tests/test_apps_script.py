import json
import os
import shutil
import subprocess
import unittest
from etl.config import ROOT
from etl.extract import extract_csv
from etl.transform import transform
from etl.validate import validate


@unittest.skipUnless(shutil.which('node'), 'Node.js is needed for Apps Script service tests')
class AppsScriptTests(unittest.TestCase):
    def test_services_and_recovery(self):
        data,errors=transform(extract_csv(ROOT/'sample_data'))
        self.assertEqual(errors,[])
        result=subprocess.run(['node','tests/apps_script_test.cjs'],cwd=ROOT,input=json.dumps(data,default=str),
                              text=True,capture_output=True,timeout=30,env=dict(os.environ,EXPORT_BULK_SNAPSHOT='1'))
        self.assertEqual(result.returncode,0,result.stdout+'\n'+result.stderr)
        line=next(line for line in result.stdout.splitlines() if line.startswith('BULK_SNAPSHOT '))
        snapshot=json.loads(line.removeprefix('BULK_SNAPSHOT '))
        converted,errors=transform(snapshot)
        self.assertEqual(errors,[])
        self.assertEqual(validate(converted),[],'Generated operational rows must pass the reporting ETL rules')
