#!/usr/bin/env bash
# Local operator wrapper only. Does not modify approved SQL, commit DDL, or deploy.
set -euo pipefail
umask 077
stage="$1"
case "$stage" in commercial|rehearsal) ;; *) echo 'Use commercial or rehearsal'; exit 2;; esac
command -v psql >/dev/null || { echo 'psql is required in the existing free workspace'; exit 2; }
command -v git >/dev/null
test "$(git remote get-url origin | sed 's/\.git$//')" = "https://github.com/renanescola40-afk/eurocomply_saas" ||
  test "$(git remote get-url origin | sed 's/\.git$//')" = "git@github.com:renanescola40-afk/eurocomply_saas"
work="$(mktemp -d "$HOME/risck-qa-2764.XXXXXX")"
ref=zrxrrfbllsxtleyxjpsz
case "$stage" in
 commercial) commit=bd247428a4afcb2aec703f2cbc22180f916804d2; artifact=scripts/qa/qa-2764-commercial-uuid-rollback-review.sql; blob=04a5b20b4cf679b74f13db1f0041412c6722329b ;;
 rehearsal) commit=924f23ca0a0f6fe591c076e0fc80020cabecb0fb; artifact=scripts/qa/qa-2764-current-organization-sso-rehearsal.sql; blob=35ab75788578457658cfc7e8885bc9f1461a0421 ;;
esac
git fetch --no-tags origin "$commit"
test "$(git rev-parse "$commit:$artifact")" = "$blob"
git cat-file blob "$blob" > "$work/approved.sql"
test "$(git hash-object "$work/approved.sql")" = "$blob"
if grep -Eiq '^[[:space:]]*COMMIT[[:space:]]*;' "$work/approved.sql"; then echo 'Unexpected COMMIT; stop'; exit 2; fi
printf 'Verified %s, target QA %s\n' "$blob" "$ref"
read -rp 'QA database host from Supabase Connect (direct or SESSION pooler, host only): ' host
case "$host" in
 "db.$ref.supabase.co") dbuser=postgres ;;
 *.pooler.supabase.com) dbuser="postgres.$ref" ;;
 *) echo 'Unapproved host; stop'; exit 2 ;;
esac
# Explicit endpoint, role, database and TLS verification; never inherit service routing.
unset PGHOSTADDR PGSERVICE PGSERVICEFILE PGOPTIONS PGPASSWORD PGSSLCERT PGSSLKEY PGSSLCRL PGSSLCRLDIR
export PGSSLMODE=verify-full PGCONNECT_TIMEOUT=10
if [ -z "$host" ]; then exit 2; fi
if [ -z "$(printenv PGSSLROOTCERT || true)" ]; then export PGSSLROOTCERT=/etc/ssl/certs/ca-certificates.crt; fi
test -r "$PGSSLROOTCERT" || { echo 'Configure the trusted QA CA certificate path; do not disable TLS verification'; exit 2; }
# psql prompts for the QA password; no secret is stored by this wrapper.
pg=(psql -X -W -h "$host" -p 5432 -U "$dbuser" -d postgres -v ON_ERROR_STOP=1 -P pager=off -A -t -F '|')
echo 'Capture and immediate-stop test (read-only; expected SQL error). Enter only the QA password.'
set +e
printf "%s\n" "BEGIN READ ONLY;" "SELECT 'CAPTURE_FIRST_2764';" "SELECT 'CAPTURE_SECOND_2764';" "SELECT 1/0;" "SELECT 'MUST_NOT_RUN_2764';" "ROLLBACK;" | tee "$work/capture-input.sql" | "$pg" 2>&1 | tee "$work/capture-probe.log"
rc=$?
set -e
test "$rc" -eq 3
grep -Fxq CAPTURE_FIRST_2764 "$work/capture-probe.log"
grep -Fxq CAPTURE_SECOND_2764 "$work/capture-probe.log"
if grep -Fxq MUST_NOT_RUN_2764 "$work/capture-probe.log"; then echo "ON_ERROR_STOP probe failed"; exit 2; fi
echo 'Capture and ON_ERROR_STOP verified.'
cat > "$work/preflight.sql" <<'SQL'
BEGIN READ ONLY;
DO $preflight$
BEGIN
 IF current_user <> 'postgres' OR current_setting('server_version_num')::int/10000 <> 17
 OR (SELECT array_agg(version::text ORDER BY version) FROM supabase_migrations.schema_migrations) IS DISTINCT FROM ARRAY['20261023113156','20261023113655','20261023114116','20261023114216','20261023115117','20261023115821','20261026102301','20261105185729','20261105225605','20261111120430','20261120134634','20261120134701','20261126172143']::text[]
 OR (SELECT count(*) FROM public.organizations)<>2
 OR (SELECT count(*) FROM auth.users)<>5
 OR (SELECT count(*) FROM public.organization_security_settings WHERE require_mfa_for_all_users)<>2
 OR (SELECT count(*) FROM public.enterprise_entitlement_sources)<>0
 OR (SELECT count(*) FROM public.enterprise_entitlement_snapshots)<>0
 OR (SELECT count(*) FROM public.subscriptions)<>0
 OR (SELECT count(*) FROM public.stripe_events_processed)<>0
 OR EXISTS(SELECT 1 FROM public.organizations WHERE app_private.resolve_commercial_plan(id) IS NOT NULL)
 OR encode(sha256(convert_to(pg_get_functiondef(to_regprocedure('public.reject_stale_enterprise_entitlement_snapshot()')),'UTF8')),'hex') IS DISTINCT FROM '2dc61d58a1e73cb3c376836df9723f6804983c7fcc6f72d85c1073f232c7c0cb'
 OR encode(sha256(convert_to(pg_get_functiondef(to_regprocedure('app_private.resolve_commercial_plan(uuid)')),'UTF8')),'hex') IS DISTINCT FROM '36186b8f0b95bf3232bfab6b086f3bf88911c53365e9fd688f58f21f50e4451d'
 OR nullif(current_setting('request.jwt.claim',true),'') IS NOT NULL
 OR nullif(current_setting('request.jwt.claims',true),'') IS NOT NULL
 OR nullif(current_setting('request.jwt.claim.sub',true),'') IS NOT NULL
 OR nullif(current_setting('request.jwt.claim.role',true),'') IS NOT NULL
 OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_my_qa_organization_context')
 OR to_regprocedure('public.get_my_mfa_bootstrap_context()') IS NULL
 OR to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NULL
 OR has_table_privilege('anon','public.enterprise_identity_connections','SELECT')
 OR has_table_privilege('authenticated','public.enterprise_identity_connections','SELECT')
 OR has_function_privilege('anon','public.get_my_mfa_bootstrap_context()','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.get_my_mfa_bootstrap_context()','EXECUTE')
 OR has_function_privilege('service_role','public.get_my_mfa_bootstrap_context()','EXECUTE')
 OR has_function_privilege('anon','app_private.qa_require_ai_inventory_actor(uuid)','EXECUTE')
 OR has_function_privilege('authenticated','app_private.qa_require_ai_inventory_actor(uuid)','EXECUTE')
 OR has_function_privilege('service_role','app_private.qa_require_ai_inventory_actor(uuid)','EXECUTE')
 OR EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND backend_type='client backend' AND (state='active' OR xact_start IS NOT NULL OR state IS NULL))
 THEN RAISE EXCEPTION 'QA_2764_PRECONDITION_REFUSED'; END IF;
END $preflight$;
SELECT 'QA_2764_PREFLIGHT_PASS',clock_timestamp();
ROLLBACK;
SQL
cat > "$work/postflight.sql" <<'SQL'
BEGIN READ ONLY;
DO $postflight$
BEGIN
 IF (SELECT array_agg(version::text ORDER BY version) FROM supabase_migrations.schema_migrations) IS DISTINCT FROM ARRAY['20261023113156','20261023113655','20261023114116','20261023114216','20261023115117','20261023115821','20261026102301','20261105185729','20261105225605','20261111120430','20261120134634','20261120134701','20261126172143']::text[]
 OR (SELECT count(*) FROM public.organizations)<>2 OR (SELECT count(*) FROM auth.users)<>5
 OR EXISTS(SELECT 1 FROM public.enterprise_entitlement_sources)
 OR EXISTS(SELECT 1 FROM public.enterprise_entitlement_snapshots)
 OR EXISTS(SELECT 1 FROM public.subscriptions)
 OR EXISTS(SELECT 1 FROM public.stripe_events_processed)
 OR EXISTS(SELECT 1 FROM public.organizations WHERE app_private.resolve_commercial_plan(id) IS NOT NULL)
 OR to_regprocedure('public.get_my_qa_organization_context()') IS NOT NULL
 OR to_regprocedure('public.get_my_mfa_bootstrap_context()') IS NULL
 OR to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NULL
 THEN RAISE EXCEPTION 'QA_2764_POSTCONDITION_REFUSED'; END IF;
END $postflight$;
SELECT 'QA_2764_ZERO_RESIDUAL_AND_13_MIGRATIONS_PASS',clock_timestamp();
ROLLBACK;
SQL
echo 'Confirm all operators have stopped competing QA work and the applicable independent review is confirmed.'
read -rp "Type QA-2764-$stage to proceed: " confirm
test "$confirm" = "QA-2764-$stage"
# Preflight and approved immutable SQL in the same psql connection.
# ON_ERROR_STOP disconnects on any error; approved SQL contains only ROLLBACK.
"$pg" -f "$work/preflight.sql" -f "$work/approved.sql" -f "$work/postflight.sql" 2>&1 | tee "$work/execution.log"
grep -q '^QA_2764_PREFLIGHT_PASS|' "$work/execution.log"
grep -q '^QA_2764_ZERO_RESIDUAL_AND_13_MIGRATIONS_PASS|' "$work/execution.log"
test "$(grep -cx ROLLBACK "$work/execution.log")" -ge 4
if [ "$stage" = commercial ]; then
 grep -Fxq '16|SYNTHETIC_SQL_CLAIMS_ONLY_NO_COMMERCIAL_ACCEPTANCE' "$work/execution.log"
 grep -Fxq '2|0|0|0|0|0' "$work/execution.log"
else
 original="$(awk -F'|' '$1=="get_my_qa_organization_context()" || $1=="public.get_my_qa_organization_context()" {print $2}' "$work/execution.log")"
 [[ "$original" =~ ^[0-9a-f]{64}$ ]]
 grep -Fxq "$original" "$work/execution.log"
 grep -Fxq "REHEARSAL_DROP_AND_ACL_CHECKS_PASSED|$original" "$work/execution.log"
 grep -Fxq 't|t|t|13' "$work/execution.log"
fi
printf 'QA_2764_%s_RUNTIME_OUTPUT_VALIDATED\n' "$stage"
printf 'Private local evidence: %s\n' "$work"
echo 'Stop here; submit sanitized evidence for independent verification. No committed installation authorized by this wrapper.'
