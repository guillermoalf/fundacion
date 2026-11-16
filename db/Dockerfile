# Postgres local para desarrollo y tests: misma versión mayor que Neon (17) + pgTAP para los tests de la base.
FROM postgres:17
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-17-pgtap \
 && rm -rf /var/lib/apt/lists/*
