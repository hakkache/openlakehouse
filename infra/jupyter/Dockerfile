# Jupyter notebook environment built on the exact same Spark distribution
# used by the cluster (apache/spark:3.5.9) to guarantee client/cluster
# protocol compatibility, per OPENLAKEHOUSE_SPEC.md Phase 4.
FROM apache/spark:3.5.9-scala2.12-java17-python3-ubuntu

USER root

RUN pip3 install --no-cache-dir \
      jupyterlab==4.2.5 \
      ipykernel==6.29.5 \
      ipywidgets==8.1.5 \
      pandas==2.2.3 \
      matplotlib==3.9.2 \
      pyarrow==17.0.0

ENV SPARK_HOME=/opt/spark
ENV PATH=$SPARK_HOME/bin:$PATH
ENV PYTHONPATH=$SPARK_HOME/python:$SPARK_HOME/python/lib/py4j-0.10.9.7-src.zip

RUN mkdir -p /opt/notebooks /opt/jupyter
COPY jupyter_server_config.py /opt/jupyter/jupyter_server_config.py

WORKDIR /opt/notebooks
EXPOSE 8888

CMD ["jupyter", "lab", "--config=/opt/jupyter/jupyter_server_config.py"]
