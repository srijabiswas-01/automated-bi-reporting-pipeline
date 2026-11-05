"""Additive display-code migration, safe for pre-upgrade snapshots and databases."""
from sqlalchemy import text
from database.model import DISPLAY_CODES


def ensure_display_code_schema(connection):
    for table,(field,_,_) in DISPLAY_CODES.items():
        connection.execute(text(f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {field} text'))
        connection.execute(text(f'CREATE UNIQUE INDEX IF NOT EXISTS {table}_{field}_key ON {table} ({field})'))
