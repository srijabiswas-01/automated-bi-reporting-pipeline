"""Additive display-code migration, safe for pre-upgrade snapshots and databases."""
from sqlalchemy import text
from database.model import DISPLAY_CODES


def ensure_display_code_schema(connection):
    # Existing installations need no DDL. Even ALTER ... IF NOT EXISTS takes
    # strong table locks, so do not issue 38 migration statements every hour.
    columns = set(connection.execute(text('''SELECT table_name, column_name
        FROM information_schema.columns WHERE table_schema=current_schema()''')).tuples())
    indexes = set(connection.execute(text('''SELECT tablename, indexname
        FROM pg_indexes WHERE schemaname=current_schema()''')).tuples())
    for table,(field,_,_) in DISPLAY_CODES.items():
        if (table, field) not in columns:
            connection.execute(text(f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {field} text'))
        index=f'{table}_{field}_key'
        if (table, index) not in indexes:
            connection.execute(text(f'CREATE UNIQUE INDEX IF NOT EXISTS {index} ON {table} ({field})'))
