import streamlit as st
from dashboard.common import context, kpis, bar, download, display_records


def render():
    st.title('Sales performance')
    data, lines = context()
    kpis(lines)
    if lines.empty:
        return
    monthly = lines.assign(month=lines.order_date.dt.strftime('%Y-%m')).groupby('month',as_index=False).net_sales.sum()
    bar(monthly,'month','net_sales','Monthly revenue')
    regions = lines.merge(data['stores'][['store_id','region']],on='store_id').groupby('region',as_index=False).net_sales.sum()
    bar(regions,'region','net_sales','Regional sales')
    categories = lines.merge(data['categories'][['category_id','category_name']],on='category_id').groupby('category_name',as_index=False).net_sales.sum()
    bar(categories,'category_name','net_sales','Category contribution')
    if len(monthly)>1:
        previous, current = monthly.net_sales.iloc[-2:]
        st.metric('Latest month growth',f'{(current-previous)/previous*100:.2f}%' if previous else '—')
        st.caption('Calendar-month totals; the latest month may be incomplete.')
    visible = display_records(lines, data)
    st.dataframe(visible,hide_index=True)
    download(visible,'sales_lines.csv')
