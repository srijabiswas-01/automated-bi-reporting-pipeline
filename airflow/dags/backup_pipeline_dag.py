"""Independent recovery: checks recent periods after the 03:00 UTC deadline."""
from datetime import datetime, timedelta, timezone
from airflow import DAG
from airflow.operators.python import PythonOperator


def recover_recent_periods():
    from etl.config import Settings
    from etl.pipeline import run
    settings=Settings.from_env()
    today=datetime.now(timezone.utc).date()
    # Also recover missed periods when the backup host was temporarily unavailable.
    for days in range(6,-1,-1):
        print(run(settings,today-timedelta(days=days),orchestrator='airflow'))


with DAG(
    dag_id='superstore_backup_pipeline',
    start_date=datetime(2026,1,1,tzinfo=timezone.utc),
    schedule='15,45 3-6 * * *',
    catchup=False,
    max_active_runs=1,
    default_args={'retries':2,'retry_delay':timedelta(minutes=5)},
    tags=['superstore','recovery'],
) as dag:
    PythonOperator(task_id='recover_missing_or_failed_periods',python_callable=recover_recent_periods)
