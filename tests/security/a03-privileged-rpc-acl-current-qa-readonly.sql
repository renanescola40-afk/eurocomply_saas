-- SEC-02/SEC-04: read-only privileged RPC and membership ACL proof.
-- RUN ONLY on Supabase QA zrxrrfbllsxtleyxjpsz using its authorized SQL connector.
-- No DML, function invocation, test users, secrets, or Production changes.
-- Tests EFFECTIVE PostgreSQL role ACLs, NOT signed JWT / API/browser denial.
-- The older a03-privileged-rpc-denial-qa-rollback.sql uses a retired
-- five-Clerk-identity fixture and is NOT equivalent to this current Auth fixture.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '8000ms';
DO $qa_preflight$
BEGIN
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701')) <> 2
    OR (SELECT count(*) FROM public.organizations) <> 2
    OR (SELECT count(*) FROM public.organization_security_settings
        WHERE require_mfa_for_all_users = true) <> 2
    OR (SELECT count(*) FROM public.organization_members m
        JOIN auth.users u ON u.id = m.user_id WHERE m.status='active') <> 5
    OR (SELECT count(DISTINCT m.organization_id) FROM public.organization_members m
        JOIN auth.users u ON u.id = m.user_id WHERE m.status='active') <> 2
    OR NOT (SELECT relrowsecurity AND relforcerowsecurity
          FROM pg_class WHERE oid='public.organization_members'::regclass)
    OR NOT (SELECT relrowsecurity AND relforcerowsecurity
          FROM pg_class WHERE oid='public.organization_security_settings'::regclass)
    OR to_regprocedure(
       'public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)') IS NULL
    OR to_regprocedure(
       'public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)') IS NULL
  THEN RAISE EXCEPTION 'SEC04_QA_AUTH_FIXTURE_OR_RLS_PREFLIGHT_REFUSED'; END IF;
END $qa_preflight$;

SET LOCAL ROLE authenticated;
DO $authenticated_denials$
BEGIN
  IF current_user <> 'authenticated' THEN
    RAISE EXCEPTION 'SEC04_WRONG_EFFECTIVE_AUTH_ROLE'; END IF;
  IF NOT has_table_privilege(current_user,'public.organization_members','SELECT') THEN
    RAISE EXCEPTION 'SEC04_AUTH_MEMBERSHIP_SELECT_MISSING'; END IF;
  IF has_table_privilege(current_user,'public.organization_members','INSERT')
    OR has_table_privilege(current_user,'public.organization_members','UPDATE')
    OR has_table_privilege(current_user,'public.organization_members','DELETE') THEN
    RAISE EXCEPTION 'SEC04_AUTH_MEMBERSHIP_MUTATION_GRANT_EXPOSED'; END IF;
  IF has_table_privilege(current_user,'public.organization_security_settings','SELECT') THEN
    RAISE EXCEPTION 'SEC04_AUTH_MFA_SETTINGS_TABLE_EXPOSED'; END IF;
  IF has_function_privilege(current_user,
       'public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)',
       'EXECUTE') THEN
    RAISE EXCEPTION 'SEC04_AUTH_PRIVILEGED_AUDIT_RPC_EXPOSED'; END IF;
  IF has_function_privilege(current_user,
       'public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)',
       'EXECUTE') THEN
    RAISE EXCEPTION 'SEC04_AUTH_ROLE_MUTATION_RPC_EXPOSED'; END IF;
  IF has_function_privilege(current_user,
       'public.create_organization_with_owner_atomic(text,text,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'SEC04_AUTH_ONBOARDING_PRIVILEGED_RPC_EXPOSED'; END IF;
END $authenticated_denials$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $anonymous_denials$
BEGIN
  IF current_user <> 'anon' THEN RAISE EXCEPTION 'SEC04_WRONG_EFFECTIVE_ANON_ROLE'; END IF;
  IF has_table_privilege(current_user,'public.organization_members','SELECT') THEN
    RAISE EXCEPTION 'SEC04_ANON_MEMBERSHIP_SELECT_EXPOSED'; END IF;
  IF has_function_privilege(current_user,
       'public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)',
       'EXECUTE') THEN
    RAISE EXCEPTION 'SEC04_ANON_AUDIT_RPC_EXPOSED'; END IF;
END $anonymous_denials$;
RESET ROLE;

DO $service_role_guard$
BEGIN
  IF NOT has_function_privilege('service_role',
    'public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)',
    'EXECUTE')
  OR NOT has_function_privilege('service_role',
    'public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)',
    'EXECUTE') THEN
    RAISE EXCEPTION 'SEC04_SERVICE_ROLE_AUTHORITY_MISSING'; END IF;
END $service_role_guard$;
ROLLBACK;
SELECT 'QA_SEC04_CURRENT_AUTH_FIXTURE_EFFECTIVE_ROLE_ACL_READONLY_PASS' AS result,
       'POSTGRES_ROLE_PRIVILEGES_ONLY_NOT_SIGNED_JWT_HTTP' AS evidence_class,
       'NOT_ACCEPTED' AS formal_control_status;