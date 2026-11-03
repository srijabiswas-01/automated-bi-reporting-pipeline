import pandas as pd
import streamlit as st
from dashboard.common import context, download


def render():
    st.title('Operational monitoring')
    data, _ = context()
    runs=data['pipeline_runs']
    if runs.empty:
        st.info('No pipeline runs recorded. Run python -m etl.pipeline to synchronize the source.')
    else:
        succeeded=runs[runs.status.eq('succeeded')]
        cols=st.columns(3)
        cols[0].metric('Successful runs',len(succeeded))
        cols[1].metric('Failed runs',int(runs.status.eq('failed').sum()))
        if not succeeded.empty:
            latest=pd.to_datetime(succeeded.finished_at,utc=True).max()
            cols[2].metric('Hours since last successful load',f'{(pd.Timestamp.now(tz="UTC")-latest).total_seconds()/3600:.1f}')
            st.caption('Latest refresh: '+str(latest.tz_convert('Asia/Kolkata')))
        st.dataframe(runs.sort_values('started_at',ascending=False),hide_index=True)
        download(runs,'pipeline_runs.csv')
    st.subheader('Data quality errors')
    st.dataframe(data['quality_errors'],hide_index=True)
    st.subheader('Shipping status')
    shipments=data['shipments']
    if not shipments.empty:
        st.dataframe(shipments.groupby('status').size().rename('shipments').reset_index(),hide_index=True)
