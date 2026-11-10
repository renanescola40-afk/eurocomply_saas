-- RISCK COMPLY / A-03 SEC-06 / A-13 DAT-03 QA ONLY.
-- Execute ONLY on pre-approved isolated QA Supabase project zrxrrfbllsxtleyxjpsz.
-- DO NOT run against PROD. This proof is synthetic, rollback-only.
-- Preconditions: >=1 QA organization; audit_events has no external side-effect
-- triggers (verify via pg_trigger); review RPC definition before re-execution.
-- No customer identifier or row data is returned.
-- A passing result DOES NOT prove true concurrent writers, correct event HMAC,
-- JWT tenant isolation, durability across crash, or independent gate acceptance.
BEGIN;
SET LOCAL statement_timeout = '8000ms';
SET LOCAL lock_timeout = '3000ms';
CREATE TEMP TABLE qa_audit_rpc_results(test_name text, passed boolean) ON COMMIT DROP;
DO $qa$
DECLARE
  v_org uuid;
  v_old_head text;
  v_row public.audit_events;
BEGIN
  SELECT id INTO v_org FROM public.organizations ORDER BY id LIMIT 1;
  IF v_org IS NULL THEN
    INSERT INTO pg_temp.qa_audit_rpc_results VALUES ('qa_fixture_present',false);
    RETURN;
  END IF;
  INSERT INTO pg_temp.qa_audit_rpc_results VALUES ('qa_fixture_present',true);
  SELECT ae.event_hash INTO v_old_head FROM public.audit_events ae
    WHERE ae.organization_id=v_org AND ae.event_hash IS NOT NULL
    ORDER BY ae.created_at DESC,ae.id DESC LIMIT 1;
  v_row := public.append_audit_event_chained(
    gen_random_uuid(),v_org,NULL,'qa.synthetic.transaction_rollback',
    'qa_test',NULL,'{}'::jsonb,clock_timestamp(),v_old_head,
    repeat('a',64),'qa-synthetic-no-valid-hmac','sha256');
  INSERT INTO pg_temp.qa_audit_rpc_results
    VALUES ('transactional_append_persisted_in_transaction', v_row.event_hash=repeat('a',64));
  BEGIN
    PERFORM public.append_audit_event_chained(
      gen_random_uuid(),v_org,NULL,'qa.synthetic.stale_head',
      'qa_test',NULL,'{}'::jsonb,clock_timestamp(),v_old_head,
      repeat('b',64),'qa-synthetic-no-valid-hmac','sha256');
    INSERT INTO pg_temp.qa_audit_rpc_results VALUES ('stale_head_rejected',false);
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    INSERT INTO pg_temp.qa_audit_rpc_results VALUES ('stale_head_rejected',true);
  END;
  BEGIN
    PERFORM public.append_audit_event_chained(
      gen_random_uuid(),v_org,NULL,'qa.synthetic.invalid_algorithm',
      'qa_test',NULL,'{}'::jsonb,clock_timestamp(),repeat('a',64),
      repeat('c',64),'qa-synthetic-no-valid-hmac','md5');
    INSERT INTO pg_temp.qa_audit_rpc_results VALUES ('invalid_algorithm_rejected',false);
  EXCEPTION WHEN SQLSTATE '22023' THEN
    INSERT INTO pg_temp.qa_audit_rpc_results VALUES ('invalid_algorithm_rejected',true);
  END;
END
$qa$;
-- Critical: a false JSON proof must abort execution, not merely emit a field.
-- PostgreSQL automatically rolls back this entire transaction on exception.
DO $qa_assert$
DECLARE
  v_total bigint;
  v_passed bigint;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE passed)
    INTO v_total, v_passed FROM pg_temp.qa_audit_rpc_results;
  IF v_total <> 4 OR v_passed <> 4 THEN
    RAISE EXCEPTION 'QA_AUDIT_CHAIN_ROLLBACK_GATE_FAILED'
      USING ERRCODE = 'P0001';
  END IF;
END
$qa_assert$;
SELECT jsonb_build_object(
  'scope','QA_SYNTHETIC_ROLLBACK_ONLY',
  'tests',jsonb_agg(jsonb_build_object('test',test_name,'passed',passed) ORDER BY test_name),
  'passed_count',count(*) FILTER (WHERE passed),
  'total_count',count(*),
  'proof_passed',(count(*)=4 AND count(*) FILTER (WHERE passed)=4)
) AS qa_proof
FROM pg_temp.qa_audit_rpc_results;
ROLLBACK;
-- In a separate read-only query after transaction completion:
-- SELECT count(*) AS total, count(*) FILTER (WHERE action LIKE 'qa.synthetic.%') AS synthetic
-- FROM public.audit_events;
