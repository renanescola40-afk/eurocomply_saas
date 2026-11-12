-- RISCK COMPLY / SEC-06 / P0-D — authorized atomic role/audit QA proof.
-- Only for isolated Supabase QA zrxrrfbllsxtleyxjpsz.
-- NEVER run against Production. Fail-closed fixture preconditions require
-- exactly 2 QA organizations and 0 audit events (Production has neither).
--
-- Performs an authorized owner -> active member role transition on a QA
-- fixture and proves both audit writes appear in the SAME PostgreSQL transaction.
-- An explicit ROLLBACK prevents any membership or audit data being committed.
-- No email, webhook or external transport. Never outputs real user/org IDs.
--
-- Intentional limitation: the synthetic 64-hex signature and hash test the
-- atomic database persistence contract, NOT HMAC validity or signed-JWT API.
-- A future signed runtime/HMAC proof remains required for formal SEC-06 PASS.
BEGIN;
SET LOCAL statement_timeout='12000ms';
SET LOCAL lock_timeout='3000ms';

DO $qa_positive$
DECLARE
 v_org uuid;
 v_actor uuid;
 v_target_id uuid;
 v_target_user uuid;
 v_role text;
 v_outcome text;
 v_after_role text;
 v_event_count integer;
 v_legacy_count integer;
 v_before_events bigint;
 v_before_logs bigint;
 v_before_members bigint;
 v_audit_id uuid := gen_random_uuid();
BEGIN
 IF (SELECT count(*) FROM public.organizations) <> 2
 OR (SELECT count(*) FROM public.audit_events) <> 0
 OR (SELECT count(*) FROM public.organization_usage) <> 2
 OR to_regprocedure(
  'public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)'
 ) IS NULL
 THEN RAISE EXCEPTION 'SEC06_QA_POSITIVE_FIXTURE_PRECONDITIONS_FAILED' USING ERRCODE='P0001';
 END IF;

 -- Refuse potential non-transactional custom trigger side effects.
 -- The current membership AFTER INSERT compatibility trigger is allowed;
 -- UPDATE of the selected member must not invoke a custom trigger.
 IF EXISTS (SELECT 1 FROM pg_trigger tr
 JOIN pg_class c ON c.oid=tr.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN
  ('organization_members','audit_events','audit_logs','organization_usage')
 AND NOT tr.tgisinternal AND tr.tgenabled<>'D'
 AND (c.relname <> 'organization_members' OR (tr.tgtype & 16)<>0)
 ) THEN RAISE EXCEPTION 'SEC06_QA_POSITIVE_TRIGGER_PRECONDITIONS_FAILED' USING ERRCODE='P0001';
 END IF;

 SELECT a.organization_id,a.user_id,t.id,t.user_id,t.role
 INTO v_org,v_actor,v_target_id,v_target_user,v_role
 FROM public.organization_members a
 JOIN public.organization_members t ON t.organization_id=a.organization_id
 WHERE lower(a.role)='owner' AND lower(a.status)='active'
 AND lower(t.role)='member' AND lower(t.status)='active'
 AND a.user_id<>t.user_id
 ORDER BY a.organization_id,t.id LIMIT 1;
 IF v_org IS NULL THEN RAISE EXCEPTION 'SEC06_QA_POSITIVE_ACTIVE_OWNER_MEMBER_NOT_FOUND' USING ERRCODE='P0001'; END IF;

 SELECT count(*) INTO v_before_events FROM public.audit_events;
 SELECT count(*) INTO v_before_logs FROM public.audit_logs;
 SELECT count(*) INTO v_before_members FROM public.organization_members;

 SELECT outcome INTO v_outcome
 FROM public.change_organization_member_role_audited_atomic(
 v_org,v_target_id,v_target_user,v_role,'viewer',v_actor,
 v_audit_id,clock_timestamp(),NULL,repeat('a',64),
 repeat('b',64), '{}'::jsonb
 );
 IF v_outcome IS DISTINCT FROM 'changed' THEN
 RAISE EXCEPTION 'SEC06_QA_POSITIVE_ROLE_RESULT_NOT_CHANGED:%',coalesce(v_outcome,'<null>') USING ERRCODE='P0001';
 END IF;

 SELECT role INTO v_after_role FROM public.organization_members WHERE id=v_target_id;
 SELECT count(*) INTO v_event_count FROM public.audit_events
 WHERE id=v_audit_id AND organization_id=v_org
 AND action='team_member_role_changed'
 AND event_hash=repeat('a',64)
 AND hash_signature=repeat('b',64)
 AND previous_hash IS NULL;
 SELECT count(*) INTO v_legacy_count FROM public.audit_logs
 WHERE organization_id=v_org AND action='team_member_role_changed'
 AND entity_id=v_target_id::text;

 IF v_after_role IS DISTINCT FROM 'viewer'
 OR v_event_count<>1 OR v_legacy_count<>1
 OR (SELECT count(*) FROM public.audit_events)<>v_before_events+1
 OR (SELECT count(*) FROM public.audit_logs)<>v_before_logs+1
 OR (SELECT count(*) FROM public.organization_members)<>v_before_members
 THEN RAISE EXCEPTION 'SEC06_QA_POSITIVE_ATOMIC_PERSISTENCE_FAILED' USING ERRCODE='P0001'; END IF;
END;
$qa_positive$;

SELECT 'PASS' AS authorized_role_change,
 'PASS' AS audit_chain_insert_same_transaction,
 'PASS' AS legacy_audit_insert_same_transaction,
 'PASS' AS member_count_unchanged,
 'QA_SYNTHETIC_ROLLBACK_ONLY_NON_CRYPTOGRAPHIC' AS proof_boundary;
ROLLBACK;

-- Last-result provider readback also proves the explicit rollback completed.
SELECT (SELECT count(*) FROM public.audit_events)::int AS post_rollback_audit_events,
 (SELECT count(*) FILTER (WHERE action='team_member_role_changed') FROM public.audit_logs)::int
 AS legacy_role_change_logs_after_rollback;
