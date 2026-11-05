import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    database_url: str
    source: str = 'csv'
    csv_dir: Path = ROOT / 'sample_data'
    spreadsheet_id: str = ''
    credentials_json: str = ''
    deadline_hour_utc: int = 3
    xlsx_path: Path = ROOT / 'sample_data' / 'superstore.xlsx'
    snapshot_path: Path = ROOT / 'operational' / 'snapshot.json.gz'
    snapshot_max_age_hours: float = 26

    @classmethod
    def from_env(cls):
        from dotenv import load_dotenv
        load_dotenv(ROOT / '.env', override=False)
        url = os.getenv('DATABASE_URL', '')
        if not url:
            raise ValueError('DATABASE_URL is required')
        import sqlalchemy
        driver = 'psycopg2' if sqlalchemy.__version__.startswith('1.') else 'psycopg'
        if url.startswith('postgresql://'):
            url = url.replace('postgresql://', f'postgresql+{driver}://', 1)
        from sqlalchemy.engine import make_url
        host=make_url(url).host or ''
        if '-pooler.' in host and host.endswith('.neon.tech'):
            raise ValueError('Use the direct Neon connection URL (pooling off) for ETL session advisory locks')
        return cls(url, os.getenv('ETL_SOURCE', 'csv'), Path(os.getenv('CSV_DIR', str(ROOT / 'sample_data'))),
                   os.getenv('SPREADSHEET_ID', ''), os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON', ''),
                   int(os.getenv('REPORTING_DEADLINE_HOUR_UTC', '3')),
                   Path(os.getenv('XLSX_PATH', str(ROOT / 'sample_data' / 'superstore.xlsx'))),
                   Path(os.getenv('SNAPSHOT_PATH', str(ROOT / 'operational' / 'snapshot.json.gz'))),
                   float(os.getenv('SNAPSHOT_MAX_AGE_HOURS', '26')))
