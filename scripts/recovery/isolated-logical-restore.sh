#!/usr/bin/env bash
# RISCK COMPLY: operator-controlled logical backup and isolated restore.
# Never execute in CI automatically. Requires PostgreSQL 17 clients, age and Docker.
set -Eeuo pipefail
umask 077
for command in pg_dump pg_restore psql age docker sha256sum; do
  command -v "$command" >/dev/null || { echo "Missing dependency: $command" >&2; exit 2; }
done
: "${RISCK_SOURCE_DATABASE_URL:?Set via a secure local secret manager}"
: "${RISCK_AGE_RECIPIENT:?Set age public recipient}"
: "${RISCK_RESTORE_PASSWORD:?Set isolated local password}"
# URL parameters override PGSSLMODE; reject any explicit TLS downgrade.
if [[ "$RISCK_SOURCE_DATABASE_URL" == *"sslmode="* && "$RISCK_SOURCE_DATABASE_URL" != *"sslmode=verify-full"* ]]; then
  echo "Source URL must use sslmode=verify-full" >&2; exit 2
fi
[[ "${PGSSLMODE:-}" == "verify-full" ]] || { echo "PGSSLMODE must be verify-full" >&2; exit 2; }
[[ "${PGSSLROOTCERT:-}" != "" ]] || { echo "Set PGSSLROOTCERT to a trusted CA bundle" >&2; exit 2; }
[[ "${RISCK_RESTORE_PASSWORD}" != *":"* ]] || { echo "Password cannot contain colon" >&2; exit 2; }
OUT="${RISCK_RECOVERY_OUTPUT_DIR:-}"
[[ -n "$OUT" && "$OUT" != "/" ]] || { echo "Set RISCK_RECOVERY_OUTPUT_DIR to a private local directory" >&2; exit 2; }
mkdir -p "$OUT"
[[ ! -e "$OUT/backup.dump.age" ]] || { echo "Output already exists; refusing overwrite" >&2; exit 2; }
work="$(mktemp -d)"
container="risck-restore-$$"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || :; rm -rf "$work"; }
trap cleanup EXIT
# No plaintext dump is written to persistent disk. pg_dump streams to age.
export PGDATABASE="$RISCK_SOURCE_DATABASE_URL"
unset RISCK_SOURCE_DATABASE_URL
pg_dump --version | grep -q 'PostgreSQL) 17\.' || { echo "PG17 pg_dump required" >&2; exit 2; }
pg_dump --format=custom --no-owner --no-acl --file=- | age -r "$RISCK_AGE_RECIPIENT" -o "$OUT/backup.dump.age"
unset PGDATABASE
sha256sum "$OUT/backup.dump.age" > "$OUT/backup.dump.age.sha256"
# Restore into disposable PostgreSQL 17. No production database URL is available to this step.
docker run -d --name "$container" --network none -e POSTGRES_PASSWORD="$RISCK_RESTORE_PASSWORD" -e POSTGRES_DB=risck_restore postgres:17 >/dev/null
ready=0
for i in $(seq 1 45); do
  if docker exec "$container" pg_isready -U postgres -d risck_restore >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
[[ "$ready" == 1 ]] || { echo "Isolated PostgreSQL failed to start" >&2; exit 1; }
# age identity is only supplied locally via the operator's secret manager.
: "${RISCK_AGE_IDENTITY_FILE:?Set a private age identity file for restore verification}"
[[ -r "$RISCK_AGE_IDENTITY_FILE" ]] || { echo "Age identity unreadable" >&2; exit 2; }
age -d -i "$RISCK_AGE_IDENTITY_FILE" "$OUT/backup.dump.age" | docker exec -i "$container" pg_restore -U postgres -d risck_restore --no-owner --no-acl --exit-on-error
table_count="$(docker exec "$container" psql -U postgres -d risck_restore -qAt -c "select count(*) from pg_catalog.pg_tables where schemaname='public'")"
[[ "$table_count" =~ ^[0-9]+$ ]] && (( table_count > 0 )) || { echo "Restore produced no public tables" >&2; exit 1; }
printf 'RESTORE_PASS=true\nPUBLIC_TABLES=%s\nPOSTGRES_MAJOR=17\nSCOPE=logical_database_only\n' "$table_count" > "$OUT/restore-evidence.txt"
echo "Isolated logical restore verified. Managed Auth/Storage objects and secrets are NOT covered."
