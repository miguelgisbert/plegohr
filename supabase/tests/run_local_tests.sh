#!/usr/bin/env bash
# Rebuild the local Supabase-like DB, apply all migrations and run the tests.
set -euo pipefail
cd "$(dirname "$0")/../.."

PSQL="docker exec -i plego-pg psql -U postgres -v ON_ERROR_STOP=1 -q"

echo "== reset schema =="
$PSQL <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
SQL

echo "== supabase environment =="
$PSQL < supabase/tests/local_supabase_env.sql

echo "== migrations =="
for f in supabase/migrations/*.sql; do
  $PSQL < "$f"
  echo "  ok: $f"
done

echo "== tests =="
docker exec -i plego-pg psql -U postgres -v ON_ERROR_STOP=1 -f - < supabase/tests/rls_and_integrity_test.sql

echo "== ALL GREEN =="
