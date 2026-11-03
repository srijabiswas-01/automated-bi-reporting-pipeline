import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import streamlit as st
from dashboard.common import context, kpis, bar, download
from dashboard.pages import sales, customers, products, inventory, pipeline_monitor

st.set_page_config(page_title='Superstore Intelligence', page_icon='📊', layout='wide')
st.markdown('<style>.stApp{background:#f5f8fa}div[data-testid="stMetric"]{background:white;padding:20px;border:1px solid #dde6eb;border-radius:10px}</style>', unsafe_allow_html=True)


def overview():
    st.title('Executive overview')
    st.write('Retail performance, original-cost profitability and stock visibility.')
    data, lines = context()
    kpis(lines)
    if not lines.empty:
        daily = lines.assign(day=lines.order_date.dt.date).groupby('day',as_index=False)[['net_sales','gross_profit']].sum()
        bar(daily,'day','net_sales','Daily net sales')
        margin = lines.gross_profit.sum()/lines.net_sales.sum()*100 if lines.net_sales.sum() else None
        st.metric('Gross margin',f'{margin:.2f}%' if margin is not None else '—')
        st.dataframe(daily, hide_index=True)
        download(daily,'daily_sales.csv')


st.navigation([
    st.Page(overview,title='Executive overview',default=True),
    st.Page(sales.render,title='Sales performance',url_path='sales'),
    st.Page(products.render,title='Product profitability',url_path='products'),
    st.Page(customers.render,title='Customer intelligence',url_path='customers'),
    st.Page(inventory.render,title='Inventory intelligence',url_path='inventory'),
    st.Page(pipeline_monitor.render,title='Operational monitoring',url_path='monitoring'),
]).run()
