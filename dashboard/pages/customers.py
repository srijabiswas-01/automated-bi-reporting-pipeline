import streamlit as st
from dashboard.common import context, bar, download


def render():
    st.title('Customer intelligence')
    data, lines = context()
    if lines.empty:
        st.info('No customer purchases match the selected filters.')
        return
    grouped = lines.groupby('customer_id').agg(completed_orders=('order_id','nunique'),period_net_sales=('net_sales','sum'),latest_purchase=('order_date','max')).reset_index()
    grouped = grouped.merge(data['customers'][['customer_id','full_name','segment_id']],on='customer_id')
    st.metric('Repeat purchase rate in selected period',f'{grouped.completed_orders.gt(1).mean()*100:.1f}%')
    segments=grouped.merge(data['segments'][['segment_id','segment_name']],on='segment_id',how='left').fillna({'segment_name':'Unassigned'})
    bar(segments.groupby('segment_name',as_index=False).period_net_sales.sum(),'segment_name','period_net_sales','Customer segments')
    st.dataframe(grouped.sort_values('period_net_sales',ascending=False),hide_index=True)
    download(grouped,'customer_intelligence.csv')
