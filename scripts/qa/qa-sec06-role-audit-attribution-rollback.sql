-- QA ONLY. Canonical trusted RPC positive event and attribution proof.
-- Synthetic fixture, ephemeral signing key; no JWT or application runtime claim.
-- No DDL, no external calls, no persisted changes; explicit rollback.
BEGIN;
SET LOCAL statement_timeout='8000ms';
SET LOCAL lock_timeout='2500ms';
DO $proof$
DECLARE
 v_org uuid; v_actor uuid; v_member uuid; v_target uuid; v_id uuid:=gen_random_uuid();
 v_key bytea:=extensions.gen_random_bytes(32); v_time timestamptz:=date_trunc('milliseconds',clock_timestamp());
 v_payload text; v_hash text; v_sig text; v_outcome text; v_role text; v_event public.audit_events;
BEGIN
 IF (SELECT count(*) FROM public.organizations)<>2 OR (SELECT count(*) FROM public.audit_events)<>0
 OR (SELECT count(*) FROM public.audit_logs)<>0 OR EXISTS (
  SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgenabled<>'D' AND (
   tgrelid IN ('public.audit_events'::regclass,'public.audit_logs'::regclass,'public.organization_usage'::regclass)
   OR (tgrelid='public.organization_members'::regclass AND ((tgtype&16)<>0 OR (tgtype&8)<>0))))
 THEN RAISE EXCEPTION 'QA_ROLE_AUDIT_PREFLIGHT_REFUSED'; END IF;
 SELECT a.organization_id,a.user_id,b.id,b.user_id INTO STRICT v_org,v_actor,v_member,v_target
 FROM public.organization_members a JOIN public.organization_members b ON a.organization_id=b.organization_id
 WHERE a.role='owner' AND b.role='member' AND a.status='active' AND b.status='active' AND a.user_id<>b.user_id
 ORDER BY a.organization_id,b.id LIMIT 1;
 v_payload:=format('{"action":"team_member_role_changed","actorUserId":%s,"createdAt":%s,"entityId":%s,"entityType":"organization_member","id":%s,"metadata":{},"organizationId":%s,"previousHash":null}',
 to_json(v_actor::text),to_json(to_char(v_time AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),to_json(v_member::text),to_json(v_id::text),to_json(v_org::text));
 v_hash:=encode(extensions.digest(convert_to(v_payload,'UTF8'),'sha256'),'hex');
 v_sig:=encode(extensions.hmac(convert_to(v_hash,'UTF8'),v_key,'sha256'),'hex');
 SELECT outcome INTO STRICT v_outcome FROM public.change_organization_member_role_audited_atomic(
 v_org,v_member,v_target,'member','viewer',v_actor,v_id,v_time,NULL,v_hash,v_sig,'{}'::jsonb);
 IF v_outcome IS DISTINCT FROM 'changed' THEN RAISE EXCEPTION 'QA_ROLE_CHANGE_NOT_OBSERVED'; END IF;
 SELECT role INTO STRICT v_role FROM public.organization_members WHERE id=v_member AND organization_id=v_org AND user_id=v_target;
 IF v_role IS DISTINCT FROM 'viewer' THEN RAISE EXCEPTION 'QA_ROLE_READBACK_FAILED'; END IF;
 SELECT * INTO STRICT v_event FROM public.audit_events WHERE id=v_id;
 IF v_event.organization_id IS DISTINCT FROM v_org OR v_event.actor_user_id IS DISTINCT FROM v_actor OR v_event.created_at IS DISTINCT FROM v_time
 OR v_event.entity_id IS DISTINCT FROM v_member::text OR v_event.entity_type IS DISTINCT FROM 'organization_member'
 OR v_event.action IS DISTINCT FROM 'team_member_role_changed' OR v_event.previous_hash IS NOT NULL
 OR v_event.event_hash IS DISTINCT FROM v_hash OR v_event.hash_signature IS DISTINCT FROM v_sig OR v_event.hash_algorithm IS DISTINCT FROM 'sha256'
 THEN RAISE EXCEPTION 'QA_EVENT_ATTRIBUTION_FAILED'; END IF;
 IF (SELECT count(*) FROM public.audit_logs WHERE organization_id=v_org AND actor_user_id=v_actor AND entity_id=v_member::text AND action='team_member_role_changed')<>1 THEN RAISE EXCEPTION 'QA_LEGACY_AUDIT_READBACK_FAILED'; END IF;
 IF (SELECT count(*) FROM public.audit_events)<>1 OR (SELECT count(*) FROM public.audit_logs)<>1 THEN RAISE EXCEPTION 'QA_AUDIT_COUNT_FAILED'; END IF;
 PERFORM set_config('risck_qa.role_audit_proof','PASS',true);
END $proof$;
SELECT current_setting('risck_qa.role_audit_proof',true) AS outcome,true AS role_readback,true AS actor_tenant_timestamp_reference,true AS signed_synthetic_event,true AS legacy_event_readback,'QA_TRUSTED_RPC_SYNTHETIC_ROLLBACK_NOT_SIGNED_HTTP' AS evidence_class;
ROLLBACK;
