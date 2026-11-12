-- RISCK COMPLY / SEC-04 + SEC-06 / P0-D — isolated QA only.
-- Replays real negative calls to the installed, service-only atomic role/audit RPC.
-- Target only Supabase QA project zrxrrfbllsxtleyxjpsz via an authorized SQL session.
-- NEVER run in Production. The QA fixture preflight additionally refuses the
-- current Production state (nonzero audit events) before any role RPC executes.
-- The two outcomes prove input-signature presence/format and unauthorized actor
-- denial. They DO NOT verify a cryptographic HMAC, signed JWT, successful role
-- transition, rollback on audit append failure, concurrent writers, or gate PASS.
-- All tests are inside a transaction ending in ROLLBACK; no email or webhook.
BEGIN;
SET LOCAL statement_timeout = '8000ms';
SET LOCAL lock_timeout = '3000ms';

DO $qa_preflight$
BEGIN
  IF (SELECT count(*) FROM public.organizations) <> 2
     OR (SELECT count(*) FROM public.audit_events) <> 0
     OR (SELECT count(*) FROM public.organization_usage) <> 2
     OR EXISTS (
       SELECT 1 FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'organization_usage'
         AND NOT t.tgisinternal AND t.tgenabled <> 'D'
     )
     OR to_regprocedure(
       'public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)'
     ) IS NULL
  THEN
    RAISE EXCEPTION 'SEC04_SEC06_QA_FIXTURE_OR_RPC_PRECONDITIONS_FAILED'
      USING ERRCODE = 'P0001';
  END IF;
END;
$qa_preflight$;

CREATE TEMP TABLE qa_role_audit_negative_results (
  test_name text NOT NULL,
  passed boolean NOT NULL
) ON COMMIT DROP;

DO $qa_test$
DECLARE
  v_org uuid;
  v_missing_signature_outcome text;
  v_unauthorized_actor_outcome text;
  v_before_members bigint;
  v_before_audits bigint;
BEGIN
  SELECT id INTO STRICT v_org FROM public.organizations ORDER BY id LIMIT 1;
  SELECT count(*) INTO v_before_members FROM public.organization_members;
  SELECT count(*) INTO v_before_audits FROM public.audit_events;

  -- Missing HMAC input must fail at argument validation, prior to any update.
  SELECT outcome INTO v_missing_signature_outcome
  FROM public.change_organization_member_role_audited_atomic(
    v_org, '00000000-0000-4000-8000-000000000011'::uuid,
    '00000000-0000-4000-8000-000000000022'::uuid,
    'member', 'admin', '00000000-0000-4000-8000-000000000033'::uuid,
    gen_random_uuid(), clock_timestamp(), NULL,
    repeat('a', 64), NULL, '{}'::jsonb
  );
  INSERT INTO pg_temp.qa_role_audit_negative_results
    VALUES ('missing_audit_signature_denied', v_missing_signature_outcome = 'invalid_input');

  -- Syntactically valid but SYNTHETIC signature: the actor has no membership.
  -- The asserted denial is the actor authorization guard, NOT HMAC validation.
  SELECT outcome INTO v_unauthorized_actor_outcome
  FROM public.change_organization_member_role_audited_atomic(
    v_org, '00000000-0000-4000-8000-000000000011'::uuid,
    '00000000-0000-4000-8000-000000000022'::uuid,
    'member', 'admin', '00000000-0000-4000-8000-000000000033'::uuid,
    gen_random_uuid(), clock_timestamp(), NULL,
    repeat('a', 64), repeat('b', 64), '{}'::jsonb
  );
  INSERT INTO pg_temp.qa_role_audit_negative_results
    VALUES ('unauthorized_actor_denied', v_unauthorized_actor_outcome = 'permission_denied');

  IF (SELECT count(*) FROM pg_temp.qa_role_audit_negative_results) <> 2
     OR EXISTS (SELECT 1 FROM pg_temp.qa_role_audit_negative_results WHERE NOT passed)
     OR (SELECT count(*) FROM public.organization_members) <> v_before_members
     OR (SELECT count(*) FROM public.audit_events) <> v_before_audits
  THEN
    RAISE EXCEPTION 'SEC04_SEC06_ROLE_AUDIT_NEGATIVE_PROOF_FAILED'
      USING ERRCODE = 'P0001';
  END IF;
END;
$qa_test$;

SELECT jsonb_build_object(
  'scope', 'QA_SYNTHETIC_ROLLBACK_ONLY',
  'subject', 'SEC-04+SEC-06',
  'passed_count', count(*) FILTER (WHERE passed),
  'total_count', count(*),
  'proof_passed', count(*) = 2 AND count(*) FILTER (WHERE passed) = 2,
  'checks', jsonb_agg(jsonb_build_object('name', test_name, 'passed', passed) ORDER BY test_name),
  'boundary', 'NOT_SIGNED_JWT_OR_CRYPTOGRAPHIC_HMAC_OR_FORMAL_GATE_PROOF'
) AS qa_role_audit_proof
FROM pg_temp.qa_role_audit_negative_results;
ROLLBACK;

-- After the transaction has completed, independently confirm QA still has
-- zero audit rows and zero synthetic actions. No customer data is returned.
SELECT count(*) AS audit_events_after_rollback,
       count(*) FILTER (WHERE action LIKE 'qa.synthetic.%') AS synthetic_audit_events_after_rollback
FROM public.audit_events;
