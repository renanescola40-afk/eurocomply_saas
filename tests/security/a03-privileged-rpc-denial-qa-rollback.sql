-- RISCK COMPLY / SEC-04 + SEC-02: privileged RPC and membership write deny test.
-- Isolated synthetic Supabase QA ONLY: zrxrrfbllsxtleyxjpsz. Never PROD.
-- Proves actual DB privileges (not only metadata), no persisted writes.
-- No external network, email, Stripe, filesystem, or production access.
BEGIN;
SET LOCAL statement_timeout = '8000ms';
SET LOCAL lock_timeout = '1000ms';

DO $qa_preflight$
BEGIN
  IF (SELECT count(*) FROM public.organizations) <> 2
    OR (SELECT count(*) FROM public.organization_members
        WHERE clerk_user_id LIKE 'qa-%' AND user_id IS NULL AND status='active') <> 5
    OR to_regprocedure('public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)') IS NULL
  THEN RAISE EXCEPTION 'SEC04_QA_DENIAL_FIXTURE_MISMATCH'; END IF;
END $qa_preflight$;

-- Test actual permissions under the effective API role. A SQLSTATE 42501
-- is required. Any successful privileged invocation fails the test.
SET LOCAL ROLE authenticated;
DO $qa_auth_deny$
DECLARE test_org uuid;
  membership_mutation_denied boolean := false;
  audit_rpc_denied boolean := false;
BEGIN
  SELECT id INTO test_org FROM public.organizations ORDER BY id LIMIT 1;
  BEGIN
    UPDATE public.organization_members
       SET role = 'owner'
     WHERE organization_id = test_org
       AND status = 'active'
       AND clerk_user_id LIKE 'qa-%';
  EXCEPTION WHEN insufficient_privilege THEN
    membership_mutation_denied := true;
  END;
  IF membership_mutation_denied IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'SEC04_QA_UNAUTHORIZED_MEMBERSHIP_WRITE_NOT_DENIED';
  END IF;

  BEGIN
    PERFORM public.append_audit_event_chained(
      gen_random_uuid(), test_org, null, 'qa.synthetic.unauthorized_rpc',
      'qa_security', null, '{}'::jsonb, clock_timestamp(), null,
      repeat('a',64), 'qa-synthetic-no-real-hmac', 'sha256'
    );
  EXCEPTION WHEN insufficient_privilege THEN
    audit_rpc_denied := true;
  END;
  IF audit_rpc_denied IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'SEC04_QA_AUTH_AUDIT_RPC_NOT_DENIED';
  END IF;
END $qa_auth_deny$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $qa_anon_deny$
DECLARE test_org uuid;
  audit_rpc_denied boolean := false;
BEGIN
  -- The fixture organization UUID is synthetic, available from the prior
  -- preflight without exposing any customer IDs to logs.
  SELECT id INTO test_org FROM public.organizations ORDER BY id LIMIT 1;
  BEGIN
    PERFORM public.append_audit_event_chained(
      gen_random_uuid(), test_org, null, 'qa.synthetic.anon_rpc',
      'qa_security', null, '{}'::jsonb, clock_timestamp(), null,
      repeat('b',64), 'qa-synthetic-no-real-hmac', 'sha256'
    );
  EXCEPTION WHEN insufficient_privilege THEN
    audit_rpc_denied := true;
  END;
  IF audit_rpc_denied IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'SEC04_QA_ANON_AUDIT_RPC_NOT_DENIED';
  END IF;
END $qa_anon_deny$;
RESET ROLE;
ROLLBACK;
SELECT 'QA_SEC04_PRIVILEGED_RPC_AND_MEMBERSHIP_WRITE_DENIAL_PASS'::text AS result;
