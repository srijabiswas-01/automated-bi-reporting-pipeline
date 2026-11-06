from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
from decimal import Decimal, InvalidOperation
import json

from database.model import TABLES, METADATA


def convert(value, kind):
    if value is None or value == '':
        return None
    if kind == 'text':
        return str(value).strip()
    if kind == 'integer':
        number = Decimal(str(value))
        if not number.is_finite() or number != number.to_integral_value() or not -2147483648 <= number <= 2147483647:
            raise ValueError('Expected PostgreSQL 32-bit integer')
        return int(number)
    if kind.startswith('numeric'):
        number = Decimal(str(value))
        if not number.is_finite() or number != number.quantize(Decimal('.01')) or abs(number) >= Decimal('1000000000000'):
            raise ValueError('Expected numeric(14,2) value')
        return number
    if kind == 'boolean':
        if value is True or str(value).lower() == 'true':
            return True
        if value is False or str(value).lower() == 'false':
            return False
        raise ValueError('Expected true or false')
    if kind == 'date':
        if isinstance(value, datetime):
            return value.astimezone(ZoneInfo('Asia/Kolkata')).date() if value.tzinfo else value.date()
        if isinstance(value, date):
            return value
        text=str(value)
        try:
            return date.fromisoformat(text)
        except ValueError:
            # Sheets Date cells are serialized to UTC by Apps Script; midnight
            # in the spreadsheet's India timezone is the preceding UTC date.
            timestamp=datetime.fromisoformat(text.replace('Z','+00:00'))
            if timestamp.tzinfo is None:
                raise ValueError('Timestamp used for a date must include a timezone')
            return timestamp.astimezone(ZoneInfo('Asia/Kolkata')).date()
    if kind == 'timestamptz':
        timestamp = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        if timestamp.tzinfo is None:
            raise ValueError('Timestamp must have timezone')
        return timestamp.astimezone(timezone.utc)
    if kind == 'jsonb':
        return json.loads(value) if isinstance(value, str) else value
    raise ValueError(f'Unsupported type {kind}')


def transform(raw):
    result, errors = {}, []
    for table, rows in raw.items():
        result[table] = []
        for index, source in enumerate(rows, 2):
            record = {}
            for name, kind, _ in TABLES[table] + METADATA:
                try:
                    record[name] = convert(source.get(name), kind)
                except (ValueError, TypeError, InvalidOperation) as exc:
                    errors.append(dict(source_table=table, source_key=str(index), rule=f'type:{name}', message=str(exc)))
            result[table].append(record)
    return result, errors
