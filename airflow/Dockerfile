FROM apache/airflow:2.10.5-python3.11
USER airflow
COPY airflow/requirements.txt /tmp/superstore-requirements.txt
RUN pip install --no-cache-dir "apache-airflow==2.10.5" -r /tmp/superstore-requirements.txt
COPY --chown=airflow:root etl /opt/superstore/etl
COPY --chown=airflow:root database /opt/superstore/database
COPY --chown=airflow:root sample_data /opt/superstore/sample_data
COPY --chown=airflow:root airflow/dags /opt/airflow/dags
ENV PYTHONPATH=/opt/superstore
