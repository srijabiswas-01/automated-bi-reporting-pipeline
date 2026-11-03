import streamlit as st
from dashboard.common import context, bar, download


def render():
    st.title('Product profitability')
    _, lines = context()
    if lines.empty:
        st.info('No sales match the selected filters.')
        return
    grouped = lines.groupby(['product_id','product_name'],as_index=False)[['net_sales','cogs','gross_profit','quantity','returned_qty']].sum()
    grouped['gross_margin_pct'] = grouped.gross_profit.div(grouped.net_sales.where(grouped.net_sales.ne(0))).mul(100)
    bar(grouped.sort_values('gross_profit',ascending=False).head(10),'product_name','gross_profit','Top products by profit')
    st.subheader('Product mix and margin')
    st.dataframe(grouped.sort_values('gross_margin_pct'),hide_index=True)
    download(grouped,'product_profitability.csv')
