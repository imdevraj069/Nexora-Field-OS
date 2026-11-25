#!/bin/bash
set -euo pipefail

echo "[pg-dev-bootstrap] Creating databases for Global Control Plane, Shards 1-3, and Backup..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE nexora_global;
  CREATE DATABASE nexora_s1;
  CREATE DATABASE nexora_s2;
  CREATE DATABASE nexora_s3;
  CREATE DATABASE nexora_backup;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "nexora_global" -f /opt/nexora-sql/01-global-schema.sql

for DB in nexora_s1 nexora_s2 nexora_s3 nexora_backup; do
  echo "[pg-dev-bootstrap] Applying shard schema to ${DB}..."
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${DB}" -f /opt/nexora-sql/02-shard-schema.sql
done

echo "[pg-dev-bootstrap] Done."
