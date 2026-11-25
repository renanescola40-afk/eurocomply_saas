-- QA ONLY: synthetic HMAC chain persistence and integrity; no application secret.
-- No DDL, no auth/billing changes, no external calls. Always rollback.
BEGIN;
SET LOCAL statement_timeout='8000ms';
SET LOCAL lock_timeout='2500ms';
DO $proof$
DECLARE
 v_org uuid; v_actor uuid; v_id uuid; v_rejected uuid:=gen_random_uuid();
 v_key bytea:=extensions.gen_random_bytes(32);
 v_prev text:=NULL; v_hash text; v_sig text; v_payload text; v_time timestamptz;
 v_saved public.audit_events; v_i int; v_count int:=0; v_err text;
 v_check_prev text:=NULL; v_calc text;
BEGIN
 IF (SELECT count(*) FROM public.organizations)<>2
 OR (SELECT count(*) FROM public.audit_events)<>0
 OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.audit_events'::regclass AND NOT tgisinternal AND tgenabled<>'D')
 THEN RAISE EXCEPTION 'QA_HMAC_PREFLIGHT_REFUSED'; END IF;
 SELECT organization_id,user_id INTO STRICT v_org,v_actor FROM public.organization_members WHERE role='owner' AND status='active' AND user_id IS NOT NULL ORDER BY organization_id,id LIMIT 1;
 -- Exact field ordering and timestamp format of audit-chain.ts for this
 -- deliberately bounded fixture (empty metadata, UUIDs and ASCII strings).
 FOR v_i IN 1..2 LOOP
  v_id:=gen_random_uuid();
  v_time:=date_trunc('milliseconds',clock_timestamp())+v_i*interval '1 second';
  v_payload:=format('{"action":"qa.synthetic.hmac_chain","actorUserId":%s,"createdAt":%s,"entityId":null,"entityType":"qa_test","id":%s,"metadata":{},"organizationId":%s,"previousHash":%s}',
   to_json(v_actor::text),to_json(to_char(v_time AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),to_json(v_id::text),to_json(v_org::text),coalesce(to_json(v_prev)::text,'null'));
  v_hash:=encode(extensions.digest(convert_to(v_payload,'UTF8'),'sha256'),'hex');
  v_sig:=encode(extensions.hmac(convert_to(v_hash,'UTF8'),v_key,'sha256'),'hex');
  PERFORM public.append_audit_event_chained(v_id,v_org,v_actor,'qa.synthetic.hmac_chain','qa_test',NULL,'{}'::jsonb,v_time,v_prev,v_hash,v_sig,'sha256');
  v_prev:=v_hash;
 END LOOP;
 FOR v_saved IN SELECT * FROM public.audit_events WHERE organization_id=v_org AND action='qa.synthetic.hmac_chain' ORDER BY created_at,id LOOP
  IF v_saved.previous_hash IS DISTINCT FROM v_check_prev OR v_saved.actor_user_id IS DISTINCT FROM v_actor OR v_saved.hash_algorithm<>'sha256' OR v_saved.metadata<>'{}'::jsonb THEN RAISE EXCEPTION 'QA_CHAIN_ATTRIBUTION_FAILED'; END IF;
  v_payload:=format('{"action":%s,"actorUserId":%s,"createdAt":%s,"entityId":null,"entityType":%s,"id":%s,"metadata":{},"organizationId":%s,"previousHash":%s}',
   to_json(v_saved.action),to_json(v_saved.actor_user_id::text),to_json(to_char(v_saved.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),to_json(v_saved.entity_type),to_json(v_saved.id::text),to_json(v_saved.organization_id::text),coalesce(to_json(v_saved.previous_hash)::text,'null'));
  v_calc:=encode(extensions.digest(convert_to(v_payload,'UTF8'),'sha256'),'hex');
  IF v_saved.event_hash IS DISTINCT FROM v_calc OR v_saved.hash_signature IS DISTINCT FROM encode(extensions.hmac(convert_to(v_calc,'UTF8'),v_key,'sha256'),'hex') THEN RAISE EXCEPTION 'QA_HMAC_READBACK_FAILED'; END IF;
  IF encode(extensions.digest(convert_to(replace(v_payload,'qa.synthetic.hmac_chain','qa.synthetic.tampered'),'UTF8'),'sha256'),'hex')=v_saved.event_hash THEN RAISE EXCEPTION 'QA_TAMPER_NOT_DETECTED'; END IF;
  v_check_prev:=v_calc; v_count:=v_count+1;
 END LOOP;
 IF v_count<>2 OR v_check_prev IS DISTINCT FROM v_prev THEN RAISE EXCEPTION 'QA_CHAIN_COUNT_FAILED'; END IF;
 BEGIN
  PERFORM public.append_audit_event_chained(v_rejected,v_org,v_actor,'qa.synthetic.stale','qa_test',NULL,'{}'::jsonb,clock_timestamp(),NULL,repeat('a',64),repeat('b',64),'sha256');
  RAISE EXCEPTION 'QA_STALE_HEAD_NOT_REJECTED';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN
  GET STACKED DIAGNOSTICS v_err=MESSAGE_TEXT;
  IF v_err IS DISTINCT FROM 'audit chain write conflict: stale head' THEN RAISE; END IF;
 END;
 IF EXISTS(SELECT 1 FROM public.audit_events WHERE id=v_rejected) OR (SELECT count(*) FROM public.audit_events)<>2 THEN RAISE EXCEPTION 'QA_FAILED_WRITE_PERSISTED'; END IF;
 PERFORM set_config('risck_qa.hmac_chain_rows',v_count::text,true);
END $proof$;
SELECT current_setting('risck_qa.hmac_chain_rows',true)::int AS verified_signed_synthetic_rows,true AS tamper_detected,true AS stale_head_denied,true AS rejected_write_absent,'QA_SYNTHETIC_HMAC_NOT_APP_RUNTIME' AS evidence_class;
ROLLBACK;
