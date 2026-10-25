#!/bin/sh
# Runs once, on first init of the data volume: creates the separate
# databases used by the API integration tests and the Playwright E2E suite.
# (An existing volume gets the E2E database from e2e/scripts/prepare-db.ts.)
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v testdb="$POSTGRES_TEST_DB" -v e2edb="${POSTGRES_E2E_DB:-qa_portal_e2e}" <<'SQL'
CREATE DATABASE :"testdb";
CREATE DATABASE :"e2edb";
SQL
