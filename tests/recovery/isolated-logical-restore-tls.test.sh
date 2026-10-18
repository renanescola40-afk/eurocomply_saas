#!/usr/bin/env bash
# Offline entry-point tests: no PostgreSQL client or network command is available.
set -Eeuo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
empty_path="$(mktemp -d)"
trap 'rm -rf "$empty_path"' EXIT
passed=0
check() {
  local label="$1" uri="$2" expected="$3" mode="${4-verify-full}" ca="${5-/synthetic/ca.pem}" service="${6-}"
  local output status=0
  output="$(PATH="$empty_path" RISCK_SOURCE_DATABASE_URL="$uri" PGSSLMODE="$mode" PGSSLROOTCERT="$ca" PGSERVICE="$service" \
    /bin/bash "$root/scripts/recovery/isolated-logical-restore.sh" 2>&1)" || status=$?
  if [[ "$status" != 2 || "$output" != "$expected" ]]; then
    printf 'FAIL: %s (unexpected status or diagnostic)\n' "$label" >&2
    exit 1
  fi
  # Exact diagnostic comparison also ensures the synthetic secret never leaks.
  passed=$((passed + 1))
  printf 'PASS: %s\n' "$label"
}
query_error='Source URI query parameters and fragments are not supported'
host_error='Source URI must name one explicit TCP host'
ready='Missing dependency: pg_dump'
check dns 'postgresql://user:SYNTHETIC_SECRET@db.example.invalid/db' "$ready"
check short_scheme 'postgres://db.example.invalid:5432/db' "$ready"
check ipv4 'postgresql://127.0.0.1/db' "$ready"
check ipv6 'postgresql://[2001:db8::1]:5432/db' "$ready"
check encoded_credentials 'postgresql://user:p%3Fsslmode%3Ddisable%40@db.example.invalid/db' "$ready"
check disable 'postgresql://db.example.invalid/db?sslmode=disable' "$query_error"
check require 'postgresql://db.example.invalid/db?sslmode=require' "$query_error"
check verify_ca 'postgresql://db.example.invalid/db?sslmode=verify-ca' "$query_error"
check duplicate_last_disable 'postgresql://db.example.invalid/db?sslmode=verify-full&sslmode=disable' "$query_error"
check duplicate_first_disable 'postgresql://db.example.invalid/db?sslmode=disable&sslmode=verify-full' "$query_error"
check encoded_key 'postgresql://db.example.invalid/db?%73slmode=disable' "$query_error"
check encoded_value 'postgresql://db.example.invalid/db?sslmode=%64isable' "$query_error"
check deprecated_ssl 'postgresql://db.example.invalid/db?ssl=true' "$query_error"
check ca_override 'postgresql://db.example.invalid/db?sslrootcert=system' "$query_error"
check service_query 'postgresql://db.example.invalid/db?service=unsafe' "$query_error"
check even_verify_full 'postgresql://db.example.invalid/db?sslmode=verify-full' "$query_error"
check empty_query 'postgresql://db.example.invalid/db?' "$query_error"
check fragment 'postgresql://db.example.invalid/db#sslmode=disable' "$query_error"
check keyword_conninfo 'host=db.example.invalid sslmode=disable' 'Source must be a PostgreSQL URI'
check empty_host 'postgresql:///db' "$host_error"
check socket_host 'postgresql://%2Fvar%2Frun%2Fpostgresql/db' "$host_error"
check multiple_hosts 'postgresql://db1.invalid,db2.invalid/db' "$host_error"
check inherited_service 'postgresql://db.example.invalid/db' 'PGSERVICE is not supported for recovery export' verify-full /synthetic/ca.pem unsafe
check weak_env 'postgresql://db.example.invalid/db' 'PGSSLMODE must be verify-full' require
check unset_mode 'postgresql://db.example.invalid/db' 'PGSSLMODE must be verify-full' ''
check missing_ca 'postgresql://db.example.invalid/db' 'Set PGSSLROOTCERT to a trusted CA bundle' verify-full ''
printf 'OFFLINE_GUARD_TESTS=%s\nBACKUP_RESTORE=NOT_TESTED\n' "$passed"
