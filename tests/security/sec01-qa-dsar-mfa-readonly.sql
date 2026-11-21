-- RISCK COMPLY SEC-01 / L-04/L-05 — QA-only DSAR MFA predicate verification.
-- QA project: zrxrrfbllsxtleyxjpsz. NEVER run against Production.
-- Read-only, no fixture creation, no migration, no write, no customer data.
-- Eight assertions: both tenants: AAL1 deny, AAL2 allow, missing identity deny;
-- plus private helper ACL checks. Uses simulated transaction-local JWT claims,
-- NOT real signed provider JWT, API/browser E2E, or formal control acceptance.
-- Requires both QA-only MFA ledger versions; fail closed for any other schema.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '12000ms';
DO $sec01_qa$
DECLARE
  o_a uuid;
  o_b uuid;
  u_a uuid;
  u_b uuid;
  ok boolean;
  n integer := 0;
  i integer;
  current_org uuid;
  current_user_id uuid;
BEGIN
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634', '20261120134701')) <> 2
     OR (SELECT count(*) FROM public.organizations) <> 2
     OR (SELECT count(*) FROM public.organization_security_settings
         WHERE require_mfa_for_all_users = true) <> 2
     OR (SELECT count(*) FROM public.organization_security_settings) <> 2
     OR (SELECT count(*) FROM public.data_subject_requests) <> 0
     OR NOT (SELECT relrowsecurity AND relforcerowsecurity
               FROM pg_class WHERE oid = 'public.data_subject_requests'::regclass)
     OR NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'data_subject_requests'
         AND policyname = 'dsar_require_mfa_for_active_members'
         AND cmd = 'SELECT' AND permissive = 'RESTRICTIVE'
     )
  THEN RAISE EXCEPTION 'SEC01_QA_PREFLIGHT_REFUSED'; END IF;

  SELECT m.organization_id, m.user_id INTO o_a, u_a
  FROM public.organization_members m JOIN auth.users u ON u.id = m.user_id
  WHERE lower(coalesce(m.status,'')) = 'active'
  ORDER BY m.organization_id, m.user_id LIMIT 1;

  SELECT m.organization_id, m.user_id INTO o_b, u_b
  FROM public.organization_members m JOIN auth.users u ON u.id = m.user_id
  WHERE lower(coalesce(m.status,'')) = 'active' AND m.organization_id <> o_a
  ORDER BY m.user_id LIMIT 1;

  IF o_a IS NULL OR o_b IS NULL OR u_a IS NULL OR u_b IS NULL
  THEN RAISE EXCEPTION 'SEC01_QA_TWO_AUTH_TENANTS_NOT_FOUND'; END IF;

  FOR i IN 1..2 LOOP
    IF i = 1 THEN current_org := o_a; current_user_id := u_a;
    ELSE current_org := o_b; current_user_id := u_b; END IF;

    PERFORM set_config('request.jwt.claim.sub', current_user_id::text, true);
    PERFORM set_config('request.jwt.claims',
      jsonb_build_object('sub', current_user_id::text,
                         'role', 'authenticated', 'aal', 'aal1')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    SELECT app_private.dsar_active_member_mfa_satisfied(current_org) INTO ok;
    IF ok IS DISTINCT FROM FALSE
    THEN RAISE EXCEPTION 'SEC01_QA_DSAR_MEMBER_AAL1_DENIAL_FAILED tenant_idx=%', i; END IF;
    n := n + 1;

    PERFORM set_config('request.jwt.claims',
      jsonb_build_object('sub', current_user_id::text,
                         'role', 'authenticated', 'aal', 'aal2')::text, true);
    SELECT app_private.dsar_active_member_mfa_satisfied(current_org) INTO ok;
    IF ok IS DISTINCT FROM TRUE
    THEN RAISE EXCEPTION 'SEC01_QA_DSAR_MEMBER_AAL2_ALLOW_FAILED tenant_idx=%', i; END IF;
    n := n + 1;

    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claims',
      jsonb_build_object('role', 'authenticated', 'aal', 'aal2')::text, true);
    SELECT app_private.dsar_active_member_mfa_satisfied(current_org) INTO ok;
    IF ok IS DISTINCT FROM FALSE
    THEN RAISE EXCEPTION 'SEC01_QA_DSAR_NO_IDENTITY_DENIAL_FAILED tenant_idx=%', i; END IF;
    n := n + 1;
    EXECUTE 'RESET ROLE';
  END LOOP;

  IF has_function_privilege('anon',
     'app_private.dsar_active_member_mfa_satisfied(uuid)', 'EXECUTE')
  THEN RAISE EXCEPTION 'SEC01_QA_DSAR_ANON_EXECUTE_EXPOSED'; END IF;
  n := n + 1;
  IF NOT has_function_privilege('authenticated',
     'app_private.dsar_active_member_mfa_satisfied(uuid)', 'EXECUTE')
  THEN RAISE EXCEPTION 'SEC01_QA_DSAR_AUTH_EXECUTE_MISSING'; END IF;
  n := n + 1;

  IF n <> 8 THEN RAISE EXCEPTION 'SEC01_QA_ASSERTION_COUNT_MISMATCH'; END IF;
END $sec01_qa$;
ROLLBACK;
SELECT 'SEC01_QA_DSAR_8_OF_8_SIMULATED_AAL_ASSERTIONS_PASS' AS test_result,
       'SQL_ONLY_NOT_SIGNED_JWT_OR_HTTP' AS evidence_class,
       'NOT_ACCEPTED' AS formal_control_status,
       (SELECT count(*) FROM public.data_subject_requests) AS qa_dsar_rows_after;
