#!/bin/sh
# Runs once, on first init of the data volume: creates the separate
# database used by the API integration tests.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v testdb="$POSTGRES_TEST_DB" <<'SQL'
CREATE DATABASE :"testdb";
SQL
