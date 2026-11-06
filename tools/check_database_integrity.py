"""Read-only audit of live retail data; outputs aggregate findings only."""
import json
from collections import Counter
from sqlalchemy import create_engine, text
from etl.config import Settings
from etl.validate import validate
from database.model import TABLES, DISPLAY_CODES


def main():
    engine = create_engine(Settings.from_env().database_url, connect_args={'connect_timeout': 20})
    try:
        with engine.connect() as conn, conn.begin():
            conn.execute(text('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'))
            conn.execute(text("SET LOCAL statement_timeout = '60s'"))
            data = {name: [dict(row) for row in conn.execute(text(f'SELECT * FROM "{name}"')).mappings()] for name in TABLES}
            errors = validate(data)
            constraints = conn.execute(text("SELECT contype, convalidated, count(*) AS count FROM pg_constraint WHERE connamespace = 'public'::regnamespace GROUP BY contype, convalidated ORDER BY contype")).mappings().all()
            triggers = conn.execute(text("SELECT tgname, tgenabled FROM pg_trigger JOIN pg_class ON pg_class.oid=tgrelid JOIN pg_namespace ON pg_namespace.oid=relnamespace WHERE nspname='public' AND NOT tgisinternal ORDER BY tgname")).mappings().all()
            runs = conn.execute(text('SELECT status, started_at, finished_at, rows_extracted, rows_loaded, error_message FROM pipeline_runs ORDER BY started_at DESC LIMIT 5')).mappings().all()
            # Error contents are intentionally omitted: only safe classifications.
            latest = [{k: str(v) if k.endswith('_at') and v else v for k,v in row.items() if k != 'error_message'} for row in runs]
            findings = Counter((e['source_table'], e['rule']) for e in errors)
            codes = {table: {'rows':len(data[table]), 'missing_codes':sum(not r.get(field) for r in data[table])} for table,(field,_,_) in DISPLAY_CODES.items()}
            chronology = sum(r['updated_at'] < r['created_at'] for rows in data.values() for r in rows)
            print(json.dumps({'table_counts': {k:len(v) for k,v in data.items()}, 'validation_errors': len(errors), 'findings': [{'table':t,'rule':r,'count':n} for (t,r),n in findings.items()], 'codes':codes, 'metadata_chronology_errors':chronology, 'constraints':[dict(r) for r in constraints], 'triggers':[dict(r) for r in triggers], 'recent_runs':latest}, default=str, indent=2))
    finally:
        engine.dispose()

if __name__ == '__main__':
    main()
