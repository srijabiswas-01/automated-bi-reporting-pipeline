import argparse
from datetime import date, datetime, timezone
import hashlib
import logging
import uuid

from sqlalchemy import create_engine, text
from etl.config import Settings
from etl.extract import extract
from etl.transform import transform
from etl.validate import validate
from etl.load import load, safe_database_error
from etl.monitoring import notify_failure
from etl.schema import ensure_display_code_schema


def lock_key(period_key):
    return int.from_bytes(hashlib.sha256(period_key.encode()).digest()[:8], 'big', signed=True)


def run(settings, period, orchestrator='manual', force=False):
    if orchestrator not in ('manual', 'github'):
        raise ValueError('Invalid orchestrator')
    period_key = 'sales_daily_' + period.isoformat()
    engine = create_engine(settings.database_url, pool_pre_ping=True, future=True, isolation_level='SERIALIZABLE')
    run_id = str(uuid.uuid4())
    errors = []
    try:
        with engine.connect() as conn:
            # One global writer lock also serializes different reporting-period backfills.
            key = lock_key('superstore_shared_analytics_writer')
            acquired = conn.scalar(text('SELECT pg_try_advisory_lock(:key)'), {'key': key})
            conn.commit()
            if not acquired:
                return {'status': 'skipped', 'reason': 'another worker owns the load'}
            try:
                with conn.begin():
                    ensure_display_code_schema(conn)
                    complete = conn.scalar(text("SELECT EXISTS(SELECT 1 FROM pipeline_runs WHERE period_key=:p AND status='succeeded')"), {'p': period_key})
                    if complete and not force:
                        return {'status': 'skipped', 'reason': 'period already completed'}
                    # Owning the advisory lock proves no cooperating worker still owns these rows.
                    conn.execute(text("UPDATE pipeline_runs SET status='failed',finished_at=now(),error_message='Recovered abandoned worker' WHERE status='running'"))
                    conn.execute(text('''INSERT INTO pipeline_runs(run_id,period_key,orchestrator,status,started_at,heartbeat_at)
                        VALUES (:id,:p,:o,'running',now(),now())'''), {'id': run_id, 'p': period_key, 'o': orchestrator})
                try:
                    raw = extract(settings)
                    data, errors = transform(raw)
                    if not errors:
                        errors = validate(data)
                    if errors:
                        raise ValueError(f'{len(errors)} source validation errors; see quality_errors')
                    with conn.begin():
                        count = load(conn, data)
                        conn.execute(text("UPDATE pipeline_runs SET status='succeeded',finished_at=now(),heartbeat_at=now(),rows_extracted=:e,rows_loaded=:l WHERE run_id=:id"),
                                     {'id': run_id, 'e': sum(map(len, data.values())), 'l': count})
                    return {'status': 'succeeded', 'run_id': run_id, 'rows_loaded': count}
                except Exception as exc:
                    diagnostic=safe_database_error(exc)
                    logging.getLogger('superstore.etl').error('Failure diagnostic: %s',diagnostic)
                    conn.rollback()
                    with conn.begin():
                        for error in errors:
                            conn.execute(text('''INSERT INTO quality_errors(error_id,run_id,source_table,source_key,rule,message)
                                VALUES (:error_id,:run_id,:source_table,:source_key,:rule,:message)'''),
                                dict(error, error_id=str(uuid.uuid4()), run_id=run_id))
                        conn.execute(text("UPDATE pipeline_runs SET status='failed',finished_at=now(),heartbeat_at=now(),error_message=:error WHERE run_id=:id"),
                                     {'id': run_id, 'error': diagnostic})
                    notify_failure(period_key, run_id)
                    # Do not leak a SQLAlchemy exception containing source values to public logs.
                    raise RuntimeError(f'ETL failed; run {run_id}. Validation errors: {len(errors)}. {diagnostic}') from None
            finally:
                conn.rollback()
                conn.execute(text('SELECT pg_advisory_unlock(:key)'), {'key': key})
                conn.commit()
    finally:
        engine.dispose()


def main():
    parser = argparse.ArgumentParser(description='Synchronize retail sources to PostgreSQL')
    parser.add_argument('--period', type=date.fromisoformat, default=datetime.now(timezone.utc).date())
    parser.add_argument('--orchestrator', choices=['manual', 'github'], default='manual')
    parser.add_argument('--force', action='store_true', help='Recheck a previously successful period using versioned upserts')
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    print(run(Settings.from_env(), args.period, args.orchestrator, args.force))


if __name__ == '__main__':
    main()
