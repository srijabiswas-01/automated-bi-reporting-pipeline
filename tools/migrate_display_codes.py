"""Add nullable unique labels to Neon, verifying all pre-existing values stay intact."""
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from sqlalchemy import create_engine,text
from database.model import TABLES,METADATA,DISPLAY_CODES
from etl.config import Settings
from etl.extract import SOURCE_TABLES
from etl.pipeline import lock_key
from etl.schema import ensure_display_code_schema
from etl.validate import primary_key


def fingerprint(connection):
    result={}
    for table in SOURCE_TABLES:
        display=DISPLAY_CODES.get(table,('','',0))[0]
        columns=[f[0] for f in TABLES[table]+METADATA if f[0]!=display]
        rows=connection.execute(text('SELECT '+','.join(columns)+' FROM '+table+' ORDER BY '+','.join(primary_key(table)))).fetchall()
        digest=hashlib.sha256(json.dumps([list(r) for r in rows],default=str).encode()).hexdigest()
        result[table]=(len(rows),digest)
    return result


def main():
    engine=create_engine(Settings.from_env().database_url,pool_pre_ping=True)
    try:
        with engine.begin() as connection:
            connection.execute(text('SELECT pg_advisory_xact_lock(:key)'),{'key':lock_key('superstore_shared_analytics_writer')})
            before=fingerprint(connection)
            ensure_display_code_schema(connection)
            if fingerprint(connection)!=before:
                raise RuntimeError('Existing business data changed; additive migration rolled back')
            print('Added/verified display-code columns and unique indexes for '+str(len(DISPLAY_CODES))+' tables.')
            print('Verified unchanged UUIDs, references, financial fields, stock values and metadata for all '+str(len(SOURCE_TABLES))+' source tables.')
    finally:
        engine.dispose()


if __name__=='__main__':
    main()
