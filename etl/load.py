from sqlalchemy import MetaData, Table, func, text
from sqlalchemy.dialects.postgresql import insert
from etl.validate import primary_key


def load(connection, data):
    # Preserve source-managed metadata when updating the analytical replica.
    connection.execute(text("SELECT set_config('superstore.preserve_metadata', 'on', true)"))
    metadata = MetaData()
    count = 0
    for name, rows in data.items():
        table = Table(name, metadata, autoload_with=connection)
        keys = primary_key(name)
        for row in rows:
            statement = insert(table).values(**row)
            update = {k: statement.excluded[k] for k in row if k not in keys}
            statement = statement.on_conflict_do_update(index_elements=keys, set_=update,
                                                         where=statement.excluded.version > table.c.version)
            count += connection.execute(statement).rowcount
        if rows:
            latest = max(rows, key=lambda row: (row['updated_at'], str(tuple(row[k] for k in keys))))
            connection.execute(text('''INSERT INTO etl_watermarks(source_table,last_updated_at,last_source_key)
                VALUES (:table,:timestamp,:key) ON CONFLICT(source_table) DO UPDATE
                SET last_updated_at=EXCLUDED.last_updated_at,last_source_key=EXCLUDED.last_source_key'''),
                dict(table=name, timestamp=latest['updated_at'], key=str(tuple(latest[k] for k in keys))))
    return count
