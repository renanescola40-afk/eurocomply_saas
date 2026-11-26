#!/usr/bin/env bash
# Local preparation only. No login, link, schema writes, migration repair or deploy.
# Run in an existing authorized local checkout, NOT a new billable Codespace.
set -euo pipefail
umask 077
export LC_ALL=C
readonly QA_REF=zrxrrfbllsxtleyxjpsz
readonly BLOB=c9f4fcb54034465c7fa4cc95f02d0fc2d9d531ca
readonly EXPECTED_SHA=9bd1146112c1ee46d87ed7cf4c8ed0797a71efed696ba03b102694c879f67bc3
readonly NAME=qa_2764_reviewed_capabilities_v2
readonly CLI_VERSION=2.122.1
REPO="$(git -C "${1:-.}" rev-parse --show-toplevel)"
# The approved blob must already be available in the local git object store.
# If missing, fetch the existing QA branch, then rerun this local preparation.
git -C "$REPO" cat-file -e "$BLOB^{blob}"
WORKSPACE="$(mktemp -d "$HOME/risck-qa-2764.XXXXXX")"
printf 'QA-only workspace: %s\n' "$WORKSPACE"
case "$WORKSPACE/" in "$REPO/"*) printf 'Workspace must be outside checkout\n' >&2; exit 1;; esac
git -C "$REPO" cat-file blob "$BLOB" > "$WORKSPACE/approved-install.sql"
printf '%s  %s\n' "$EXPECTED_SHA" "$WORKSPACE/approved-install.sql" | sha256sum -c -
cd "$WORKSPACE"
# Avoid inherited target overrides; no remote commands are performed here.
unset SUPABASE_WORKDIR SUPABASE_DB_URL DATABASE_URL PGHOST PGDATABASE PGUSER PGPASSWORD PGSERVICE PGSERVICEFILE SUPABASE_PROJECT_REF SUPABASE_DB_PASSWORD SUPABASE_ACCESS_TOKEN
npm init -y >/dev/null
npm install --save-exact --no-audit --no-fund "supabase@$CLI_VERSION"
CLI="$WORKSPACE/node_modules/.bin/supabase"
test "$("$CLI" --version | head -n1)" = "$CLI_VERSION"
"$CLI" migration new --help
"$CLI" migration new "$NAME"
shopt -s nullglob
files=( "$WORKSPACE/supabase/migrations/"*_"$NAME".sql )
test "${#files[@]}" -eq 1
MIGRATION="${files[0]}"
VERSION="$(basename "$MIGRATION" "_$NAME.sql")"
[[ "$VERSION" =~ ^[0-9]{14}$ ]]
cp -- "$WORKSPACE/approved-install.sql" "$MIGRATION"
cmp -- "$WORKSPACE/approved-install.sql" "$MIGRATION"
printf '%s  %s\n' "$EXPECTED_SHA" "$MIGRATION" | sha256sum -c -
test "$(git -C "$REPO" hash-object "$MIGRATION")" = "$BLOB"
printf '%s\n' "$VERSION" > "$WORKSPACE/qa-migration-version.txt"
printf 'QA_REF=%s\nCLI_VERSION=%s\nMIGRATION_VERSION=%s\nINSTALL_BLOB=%s\nINSTALL_SHA256=%s\n' "$QA_REF" "$CLI_VERSION" "$VERSION" "$BLOB" "$EXPECTED_SHA" > "$WORKSPACE/preparation-evidence.txt"
printf 'LOCAL_PREPARATION_PASS\nWorkspace: %s\nMigration: %s\nVersion: %s\n' "$WORKSPACE" "$MIGRATION" "$VERSION"
# Stop here. Keep this workspace and its package-lock.json outside the app repo.
# Never run migration up, db push or repair before verified committed execution.
