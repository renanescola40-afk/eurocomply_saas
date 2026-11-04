-- RISCK COMPLY / SEC-06 / A-03
-- Strict synthetic QA-only transaction rehearsal. Do NOT run on production.
-- This script deliberately inserts one temporary audit row, rejects one
-- incorrect previous_hash, and ROLLBACKs. It does not prove signed-JWT
-- enforcement or cryptographic hash correctness; run authenticated API,
-- concurrent-write, hash-verifier and tenant isolation tests separately.
-- Fixture preconditions fail closed if QA differs from two synthetic orgs
-- and zero existing audit events. No emails, webhooks or external calls.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';
DO $sec06_rehearsal$
DECLARE
  v_org uuid;
  v_probe uuid := 'dc5aa791-a0e5-4af1-92e8-ce9af2f93827';
  v_rejected_id uuid := 'de73b99e-2c3b-4551-87f8-9f3c3b9b4b2d';
  v_rejected boolean := false;
  v_error text;
  v_count integer;
BEGIN
  IF (SELECT count(*) FROM public.organizations) <> 2
    OR (SELECT count(*) FROM public.audit_events) <> 0 THEN
    RAISE EXCEPTION 'SEC06_QA_FIXTURE_PRECONDITIONS_FAILED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger tr
    JOIN pg_class c ON c.oid = tr.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='audit_events'
      AND NOT tr.tgisinternal
  ) THEN
    RAISE EXCEPTION 'SEC06_AUDIT_TRIGGER_PRECONDITIONS_FAILED';
  END IF;
  SELECT id INTO STRICT v_org FROM public.organizations ORDER BY id LIMIT 1;
  IF EXISTS (SELECT 1 FROM public.audit_events WHERE id IN (v_probe, v_rejected_id)) THEN
    RAISE EXCEPTION 'SEC06_PROBE_IDS_ALREADY_USED';
  END IF;

  PERFORM public.append_audit_event_chained(
    p_id => v_probe, p_organization_id => v_org, p_actor_user_id => NULL,
    p_action => 'security.qa_transaction_rollback_probe',
    p_entity_type => 'synthetic_security_test', p_entity_id => NULL,
    p_metadata => jsonb_build_object('_sec06_synthetic_probe','v20_tx_rollback_20261103'),
    p_created_at => now(), p_previous_hash => NULL,
    p_event_hash => repeat('a',64), p_hash_signature => NULL, p_hash_algorithm => 'sha256'
  );
  SELECT count(*) INTO v_count FROM public.audit_events WHERE id = v_probe;
  IF v_count <> 1 THEN RAISE EXCEPTION 'SEC06_ATOMIC_INSERT_NOT_OBSERVED'; END IF;

  BEGIN
    PERFORM public.append_audit_event_chained(
      p_id => v_rejected_id, p_organization_id => v_org, p_actor_user_id => NULL,
      p_action => 'security.qa_stale_head_probe',
      p_entity_type => 'synthetic_security_test', p_entity_id => NULL,
      p_metadata => '{}'::jsonb, p_created_at => now(),
      p_previous_hash => repeat('0',64), p_event_hash => repeat('b',64),
      p_hash_signature => NULL, p_hash_algorithm => 'sha256'
    );
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
    IF v_error = 'audit chain write conflict: stale head' THEN
      v_rejected := true;
    ELSE
      RAISE EXCEPTION 'SEC06_UNEXPECTED_P0001: %', v_error;
    END IF;
  END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'SEC06_STALE_HEAD_NOT_REJECTED'; END IF;
  IF EXISTS (SELECT 1 FROM public.audit_events WHERE id = v_rejected_id) THEN
    RAISE EXCEPTION 'SEC06_REJECTED_WRITE_PERSISTED';
  END IF;
END;
$sec06_rehearsal$;
SELECT 'PASS' AS within_tx_assertions, count(*) AS temporary_probe_rows
FROM public.audit_events
WHERE metadata->>'_sec06_synthetic_probe'='v20_tx_rollback_20261103';
ROLLBACK;
-- The final query proves no test row remains after the transaction.
SELECT 'PASS' AS independent_rollback_readback, count(*) AS persisted_probe_rows
FROM public.audit_events
WHERE id IN ('dc5aa791-a0e5-4af1-92e8-ce9af2f93827'::uuid,
             'de73b99e-2c3b-4551-87f8-9f3c3b9b4b2d'::uuid);
