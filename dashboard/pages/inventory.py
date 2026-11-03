import pandas as pd
import streamlit as st
from dashboard.common import context, bar, download


def render():
    st.title('Inventory intelligence')
    data, _ = context()
    balances=data['inventory_balances'].copy()
    if not balances.empty:
        balances=balances[balances.is_active.astype(str).str.lower().eq('true') | balances.is_active.eq(True)]
    if balances.empty:
        st.info('No stock balances recorded.')
        return
    balances=balances.merge(data['products'][['product_id','sku','product_name','cost_price']],on='product_id')
    for column in ('quantity_on_hand','quantity_reserved','reorder_point','cost_price'):
        balances[column]=pd.to_numeric(balances[column])
    balances['available_quantity']=balances.quantity_on_hand-balances.quantity_reserved
    balances['needs_reorder']=balances.available_quantity<=balances.reorder_point
    balances['current_stock_value']=balances.quantity_on_hand*balances.cost_price
    cols=st.columns(3)
    cols[0].metric('Current stock value',f'₹{balances.current_stock_value.sum():,.2f}')
    cols[1].metric('Stockout lines',int(balances.available_quantity.eq(0).sum()))
    cols[2].metric('Reorder alerts',int(balances.needs_reorder.sum()))
    store=st.selectbox('Inventory store',['All']+list(balances.store_id.unique()))
    if store!='All':
        balances=balances[balances.store_id.eq(store)]
    bar(balances,'product_name','available_quantity','Available stock')
    st.dataframe(balances.sort_values('available_quantity'),hide_index=True)
    st.caption('Current-cost valuation. Turnover and inventory ageing require historical valuation and lot snapshots and are not inferred from the current balance.')
    download(balances,'inventory.csv')
