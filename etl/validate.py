"""Validate the complete snapshot before any reporting tables change."""
import re
from database.model import TABLES, METADATA, COMPOSITE_KEYS


def primary_key(table):
    if table in COMPOSITE_KEYS:
        return COMPOSITE_KEYS[table].split(', ')
    return [next(f[0] for f in TABLES[table] if 'PRIMARY KEY' in f[2])]


def validate(data):
    errors = []

    def error(table, index, rule, message):
        errors.append(dict(source_table=table, source_key=str(index), rule=rule, message=message))

    for table, rows in data.items():
        seen = set()
        unique = {}
        for index, row in enumerate(rows, 2):
            key = tuple(row.get(k) for k in primary_key(table))
            if key in seen:
                error(table, index, 'primary_key', 'Duplicate key')
            seen.add(key)
            for name, _, rule in TABLES[table] + METADATA:
                value = row.get(name)
                if value is None or value == '':
                    if 'NOT NULL' in rule or 'PRIMARY KEY' in rule:
                        error(table, index, 'required', f'{name} is required')
                    continue
                if 'UNIQUE' in rule:
                    if (name, value) in unique:
                        error(table, index, 'unique', f'Duplicate {name}')
                    unique[name, value] = True
                ref = re.search(r'REFERENCES (\w+)\((\w+)\)', rule)
                if ref and not any(r.get(ref[2]) == value for r in data.get(ref[1], [])):
                    error(table, index, 'foreign_key', f'Unknown {name}')
                # CHECK expressions originate only in the trusted canonical model.
                if 'CHECK (' in rule:
                    expression = rule.split('CHECK (', 1)[1][:-1]
                    expression = expression.replace(' IN ', ' in ').replace(' AND ', ' and ').replace('<>', '!=')
                    try:
                        if not eval(expression, {'__builtins__': {}}, row):
                            error(table, index, 'check', f'{name} violates {expression}')
                    except (TypeError, NameError):
                        # PostgreSQL CHECK allows NULL operands; required fields are checked separately.
                        pass
    def keyed(table, *keys):
        return {tuple(r.get(k) for k in keys): r for r in data.get(table, [])}

    purchases = keyed('purchase_orders', 'po_id')
    purchase_lines = keyed('purchase_order_items', 'po_id', 'line_no')
    receipts = keyed('goods_receipts', 'receipt_id')
    received = {}
    for index, line in enumerate(data.get('goods_receipt_items', []), 2):
        header = receipts.get((line.get('receipt_id'),), {})
        key = (header.get('po_id'), line.get('po_line_no'))
        original = purchase_lines.get(key)
        if original is None:
            error('goods_receipt_items', index, 'purchase_line', 'Unknown original purchase line')
        elif header.get('status') == 'posted' and header.get('is_active') and line.get('is_active'):
            received[key] = received.get(key, 0) + (line.get('received_qty') or 0)
            if received[key] > original.get('ordered_qty', 0):
                error('goods_receipt_items', index, 'over_receipt', 'Received more than ordered')
    orders = keyed('sales_orders', 'order_id')
    sale_lines = keyed('sales_order_items', 'order_id', 'line_no')
    returns = keyed('returns', 'return_id')
    returned = {}
    for index, line in enumerate(data.get('return_items', []), 2):
        header = returns.get((line.get('return_id'),), {})
        key = (header.get('order_id'), line.get('order_line_no'))
        original = sale_lines.get(key)
        if original is None:
            error('return_items', index, 'order_line', 'Unknown original order line')
        elif header.get('status') == 'accepted' and header.get('is_active') and line.get('is_active'):
            returned[key] = returned.get(key, 0) + (line.get('returned_qty') or 0)
            if returned[key] > original.get('quantity', 0) or orders.get((key[0],), {}).get('order_status') != 'completed':
                error('return_items', index, 'over_return', 'Invalid accepted return quantity or order state')
    movements = {}
    for row in data.get('inventory_movements', []):
        if row.get('is_active'):
            key = (row.get('store_id'), row.get('product_id'))
            movements[key] = movements.get(key, 0) + (row.get('quantity_change') or 0)
    balances = keyed('inventory_balances', 'store_id', 'product_id')
    for key in set(balances) | set(movements):
        if balances.get(key, {}).get('quantity_on_hand') != movements.get(key, 0):
            error('inventory_balances', key, 'ledger_reconciliation', 'On-hand quantity differs from movement ledger')
    return errors
