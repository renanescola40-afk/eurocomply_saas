-- RISCK COMPLY / SEC-06 / P0-D — isolated QA only.
-- Tests rollback of an authorized atomic role change when append-audit CAS
-- rejects a deliberately stale previous hash.
--
-- Run ONLY via authorized SQL on Supabase QA zrxrrfbllsxtleyxjpsz. NEVER on
-- Production. Fail-closed synthetic fixture preflight requires exactly two QA
-- organizations and zero existing audit events; Production does not meet it.
-- Selects ephemeral QA active owner/target member without exporting IDs.
-- The syntactically valid dummy signature is NOT a genuine HMAC; this proof
-- tests database atomic rollback, NOT cryptographic verification or JWT auth.
-- No e-mail, webhook, external side effects or persistent SQL changes.
BEGIN;
SET LOCAL statement_timeout = '10000ms';
SET LOCAL lock_timeout = '2500ms';

DO $qa_atomic_rollback$
DECLARE
  v_org uuid;
  v_actor uuid;
  v_target_id uuid;
  v_target_user uuid;
  v_target_role text;
  v_stale_rejected boolean := false;
  v_outcome text;
  v_error text;
  v_after_role text;
  v_old_members bigint;
  v_old_audits bigint;
BEGIN
  IF (SELECT count(*) FROM public.organizations) <> 2
     OR (SELECT count(*) FROM public.audit_events) <> 0
     OR to_regprocedure(
       'public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)'
     ) IS NULL
     OR EXISTS (
       SELECT 1 FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'organization_members'
         AND NOT t.tgisinternal AND t.tgenabled <> 'D'
         AND (t.tgtype & 16) <> 0 -- UPDATE triggers must be absent.
     )
  THEN
    RAISE EXCEPTION 'SEC06_QA_ATOMIC_ROLLBACK_PRECONDITIONS_FAILED'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT actor.organization_id, actor.user_id,
         target.id, target.user_id, target.role
    INTO v_org, v_actor, v_target_id, v_target_user, v_target_role
  FROM public.organization_members actor
  JOIN public.organization_members target
    ON target.organization_id = actor.organization_id
  WHERE lower(actor.role) = 'owner'
    AND lower(actor.status) = 'active'
    AND lower(target.role) = 'member'
    AND lower(target.status) = 'active'
    AND actor.user_id <> target.user_id
  ORDER BY actor.organization_id, target.id LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'SEC06_QA_ACTIVE_OWNER_MEMBER_FIXTURE_MISSING'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_old_members FROM public.organization_members;
  SELECT count(*) INTO v_old_audits FROM public.audit_events;

  BEGIN
    SELECT outcome INTO v_outcome
    FROM public.change_organization_member_role_audited_atomic(
      v_org, v_target_id, v_target_user, v_target_role,
      'viewer', v_actor, gen_random_uuid(), clock_timestamp(),
      repeat('0', 64), -- Wrong predecessor: empty QA chain has NULL head.
      repeat('a', 64), repeat('b', 64), '{}'::jsonb
    );
    RAISE EXCEPTION 'SEC06_QA_APPEND_FAILURE_NOT_OBSERVED: %',
      coalesce(v_outcome, '<null>') USING ERRCODE = 'P0001';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
    IF v_error IS DISTINCT FROM 'audit chain write conflict: stale head' THEN
      RAISE EXCEPTION 'SEC06_QA_UNEXPECTED_ERROR: %', v_error
        USING ERRCODE = 'P0001';
    END IF;
    v_stale_rejected := true;
  END;

  SELECT role INTO v_after_role
  FROM public.organization_members WHERE id = v_target_id;
  IF NOT v_stale_rejected OR v_after_role IS DISTINCT FROM v_target_role
     OR (SELECT count(*) FROM public.organization_members) <> v_old_members
     OR (SELECT count(*) FROM public.audit_events) <> v_old_audits THEN
    RAISE EXCEPTION 'SEC06_QA_ROLE_AUDIT_ATOMIC_ROLLBACK_FAILED'
      USING ERRCODE = 'P0001';
  END IF;
END;
$qa_atomic_rollback$;

SELECT 'PASS' AS stale_head_rejection,
       'PASS' AS original_role_retained,
       'PASS' AS audit_events_unchanged,
       'QA_SYNTHETIC_ROLLBACK_ONLY' AS scope;
ROLLBACK;

-- Independent post-transaction readback; do not export tenant or user IDs.
SELECT count(*) AS audit_events_after_rollback,
       count(*) FILTER (WHERE action LIKE 'qa.synthetic.%')
         AS synthetic_audit_events_after_rollback
FROM public.audit_events;
