import logging
import re
from sqlalchemy import MetaData, Table, text
from sqlalchemy.dialects.postgresql import insert
from etl.validate import primary_key

LOGGER=logging.getLogger('superstore.etl')


class LoadFailure(RuntimeError):
    pass


def safe_database_error(exc):
    if isinstance(exc,LoadFailure):
        return str(exc)
    original=getattr(exc,'orig',exc)
    diag=getattr(original,'diag',None)
    pieces=[type(exc).__name__]
    for key,value in (('sqlstate',getattr(original,'sqlstate',None)),
                      ('constraint',getattr(diag,'constraint_name',None)),
                      ('column',getattr(diag,'column_name',None))):
        if value and re.fullmatch(r'[A-Za-z0-9_]{1,100}',str(value)):
            pieces.append(key+'='+str(value))
    return '; '.join(pieces)


def load(connection, data):
    # Preserve source-managed metadata when updating the analytical replica.
    connection.execute(text("SELECT set_config('superstore.preserve_metadata', 'on', true)"))
    metadata = MetaData()
    count = 0
    for name, rows in data.items():
        try:
            table = Table(name, metadata, autoload_with=connection)
            keys = primary_key(name)
            for start in range(0,len(rows),100):
                batch=rows[start:start+100]
                statement = insert(table).values(batch)
                update = {k: statement.excluded[k] for k in batch[0] if k not in keys}
                statement = statement.on_conflict_do_update(index_elements=keys, set_=update,
                                                             where=statement.excluded.version > table.c.version)
                # psycopg may report rowcount=-1 for INSERT. RETURNING also counts
                # only rows actually inserted/updated when old versions are skipped.
                count += len(connection.execute(statement.returning(table.c[keys[0]])).fetchall())
            if rows:
                latest = max(rows, key=lambda row: (row['updated_at'], str(tuple(row[k] for k in keys))))
                connection.execute(text('''INSERT INTO etl_watermarks(source_table,last_updated_at,last_source_key)
                    VALUES (:table,:timestamp,:key) ON CONFLICT(source_table) DO UPDATE
                    SET last_updated_at=EXCLUDED.last_updated_at,last_source_key=EXCLUDED.last_source_key'''),
                    dict(table=name, timestamp=latest['updated_at'], key=str(tuple(latest[k] for k in keys))))
            LOGGER.info('Prepared table %s (%d source rows)',name,len(rows))
        except Exception as exc:
            raise LoadFailure('table='+name+'; '+safe_database_error(exc)) from None
    return count
