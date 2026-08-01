FROM trinodb/trino:475

# Phase 17 (Observability): bundle the JMX Prometheus javaagent so Trino's JVM/query
# metrics can be scraped by Prometheus without touching the base image's launch scripts.
ADD --chmod=644 https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/1.0.1/jmx_prometheus_javaagent-1.0.1.jar /usr/lib/trino/jmx_prometheus_javaagent.jar
COPY --chmod=644 jmx-config.yml /usr/lib/trino/jmx-config.yml
COPY --chmod=644 jvm.config /etc/trino/jvm.config

USER trino
