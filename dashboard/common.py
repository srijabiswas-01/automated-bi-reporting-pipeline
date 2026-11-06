import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st
from dotenv import dotenv_values
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parents[1]
REPORT_TABLES = ('products', 'categories', 'customers', 'segments', 'stores', 'sales_orders',
                 'sales_order_items', 'returns', 'return_items', 'inventory_balances',
                 'inventory_movements', 'shipments', 'pipeline_runs', 'quality_errors')


def demo_mode():
    # Read the file before deciding the source. Settings.from_env is only called
    # on the database path, so it cannot initialize this decision for us.
    configured=dotenv_values(ROOT / '.env').get('DASHBOARD_DEMO') or 'true'
    return os.getenv('DASHBOARD_DEMO',configured).strip().lower()=='true'


@st.cache_data(ttl=60)
def source_data(demo):
    if demo:
        return {table: pd.read_csv(ROOT / 'sample_data' / f'{table}.csv', keep_default_na=False)
                if (ROOT / 'sample_data' / f'{table}.csv').exists() else pd.DataFrame()
                for table in REPORT_TABLES}
    from etl.config import Settings
    engine = create_engine(Settings.from_env().database_url, pool_pre_ping=True)
    try:
        with engine.connect() as conn, conn.begin():
            conn.execute(text('SET TRANSACTION READ ONLY'))
            return {table: pd.read_sql(text(f'SELECT * FROM {table}'), conn) for table in REPORT_TABLES}
    finally:
        engine.dispose()


def sales_lines(data):
    """Apply the same revenue and original-cost policy as reporting_sales_lines."""
    orders = data['sales_orders'].copy()
    items = data['sales_order_items'].copy()
    if orders.empty or items.empty:
        return pd.DataFrame(columns=['order_id','order_date','store_id','customer_id','product_id','quantity',
                                     'returned_qty','net_sales','cogs','gross_profit','category_id','product_name'])
    def active(df):
        return df[df['is_active'].astype(str).str.lower().eq('true') | df['is_active'].eq(True)]
    orders = active(orders)
    orders = orders[orders.order_status.eq('completed')]
    lines = orders.merge(active(items), on='order_id', suffixes=('_order', ''))
    lines['returned_qty'] = 0
    if not data['returns'].empty and not data['return_items'].empty:
        returns = active(data['returns'])
        returns = returns[returns.status.eq('accepted')]
        returned = returns[['return_id','order_id']].merge(active(data['return_items']), on='return_id')
        returned = returned.groupby(['order_id','order_line_no'], as_index=False).returned_qty.sum()
        lines = lines.drop(columns='returned_qty').merge(returned, how='left', left_on=['order_id','line_no'],
                                                        right_on=['order_id','order_line_no'])
        lines['returned_qty'] = lines.returned_qty.fillna(0)
    for column in ('quantity','returned_qty','unit_price','discount','cost_snapshot'):
        lines[column] = pd.to_numeric(lines[column])
    effective = lines.quantity - lines.returned_qty
    lines['net_sales'] = effective * (lines.unit_price - lines.discount / lines.quantity)
    lines['cogs'] = effective * lines.cost_snapshot
    lines['gross_profit'] = lines.net_sales - lines.cogs
    lines['order_date'] = pd.to_datetime(lines.order_date, utc=True).dt.tz_convert('Asia/Kolkata')
    return lines.merge(data['products'][['product_id','product_name','category_id']], on='product_id', how='left')


def context():
    demo = demo_mode()
    source_key='demo' if demo else 'database'
    if st.session_state.get('_reporting_source')!=source_key:
        st.session_state.pop('sales_period',None)
        st.session_state['_reporting_source']=source_key
    st.sidebar.caption('Synthetic CSV demo' if demo else 'PostgreSQL reporting data')
    if demo:
        st.info('Synthetic demonstration records. Switch DASHBOARD_DEMO=false to read PostgreSQL.')
    try:
        data = source_data(demo)
    except Exception:
        st.error('Reporting data is unavailable. Check the database connection and deployment configuration.')
        st.stop()
    lines = sales_lines(data)
    if st.sidebar.button('Refresh data'):
        source_data.clear()
        st.rerun()
    if not lines.empty:
        minimum, maximum = lines.order_date.dt.date.min(), lines.order_date.dt.date.max()
        dates = st.sidebar.date_input('Sales period', value=(minimum, maximum), key='sales_period')
        stores = data['stores']
        store_map = dict(zip(stores.store_id, stores.store_name))
        selected = st.sidebar.multiselect('Stores', list(store_map), format_func=lambda x:store_map[x])
        categories = data['categories']
        category_map = dict(zip(categories.category_id, categories.category_name))
        category = st.sidebar.multiselect('Categories', list(category_map), format_func=lambda x:category_map[x])
        if len(dates) == 2:
            lines = lines[(lines.order_date.dt.date >= dates[0]) & (lines.order_date.dt.date <= dates[1])]
        if selected:
            lines = lines[lines.store_id.isin(selected)]
        if category:
            lines = lines[lines.category_id.isin(category)]
    st.caption('Sales exclude tax; accepted returns restate the original sale date. Filters apply to sales-derived charts. Stock is a current snapshot.')
    return data, lines


def kpis(lines):
    net, profit = lines.net_sales.sum(), lines.gross_profit.sum()
    orders = lines.order_id.nunique()
    for col, title, value in zip(st.columns(4), ('Net sales','Gross profit','Completed orders','Average order value'),
                                 (f'₹{net:,.2f}', f'₹{profit:,.2f}', f'{orders:,}', f'₹{net/orders:,.2f}' if orders else '—')):
        col.metric(title,value)


def bar(frame, x, y, title):
    if frame.empty:
        st.caption('No records match these filters.')
    else:
        figure=px.bar(frame, x=x, y=y, title=title, color_discrete_sequence=['#087f70'])
        figure.update_xaxes(type='category')
        st.plotly_chart(figure, width='stretch')


def download(frame, filename):
    st.download_button('Download CSV', frame.to_csv(index=False).encode(), filename, 'text/csv')


def display_records(frame, data):
    """Resolve business references to permanent codes without changing join keys."""
    from database.model import DISPLAY_CODES
    result = frame.copy()
    for table, (code, _, _) in DISPLAY_CODES.items():
        master = data.get(table)
        if master is None or master.empty:
            continue
        from database.model import TABLES
        key = TABLES[table][0][0]
        if key not in result or key not in master:
            continue
        mapping = master.set_index(key)[code] if code in master else pd.Series(dtype=str)
        values = result[key].map(mapping).replace('', pd.NA).fillna('Code pending sync')
        if code in result:
            result[code] = result[code].replace('', pd.NA).fillna(values)
        else:
            result.insert(result.columns.get_loc(key), code, values)
    # UUIDs and technical references are retained only in the calculation frames.
    return result.drop(columns=[c for c in result if c.endswith('_id') or c.endswith('_id_order')])
