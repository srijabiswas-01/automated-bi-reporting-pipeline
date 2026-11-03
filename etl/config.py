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
        return cls(url, os.getenv('ETL_SOURCE', 'csv'), Path(os.getenv('CSV_DIR', str(ROOT / 'sample_data'))),
                   os.getenv('SPREADSHEET_ID', ''), os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON', ''),
                   int(os.getenv('REPORTING_DEADLINE_HOUR_UTC', '3')))
