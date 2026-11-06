-- RISCK COMPLY QA-only PostgreSQL 17 seat release rehearsal. NO PROD, NO EMAIL.
-- Transactional synthetic records; all rows rolled back. Fail closed on wrong DB.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $guard$
BEGIN
 IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='20261105185729')<>1
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations)>=100
    OR current_setting('server_version_num')::int<170000 THEN
  RAISE EXCEPTION 'QA_ONLY_MARKER_OR_POSTGRES_17_MISSING';
 END IF;
END $guard$;
CREATE TEMP TABLE qa_seat_proof(test_case text PRIMARY KEY, outcome text) ON COMMIT DROP;
DO $qa$
DECLARE
 org uuid:=gen_random_uuid(); u1 uuid:=gen_random_uuid(); u2 uuid:=gen_random_uuid();
 u3 uuid:=gen_random_uuid(); m1 uuid:=gen_random_uuid(); m2 uuid:=gen_random_uuid();
 m3 uuid:=gen_random_uuid(); outcome_value text; count_value integer;
BEGIN
 INSERT INTO auth.users(id) VALUES(u1),(u2),(u3);
 INSERT INTO public.organizations(id,name,owner_id) VALUES(org,'QA_SYNTHTEST_P0E_ROLLBACK',u1);
 INSERT INTO public.organization_members(id,organization_id,user_id,role,seat_type,status)
 VALUES(m1,org,u1,'owner','full','active');
 SELECT f.outcome INTO outcome_value FROM public.release_organization_seat_atomic(org,m1,u1,'qa-single-owner-0001','admin') f;
 IF outcome_value IS DISTINCT FROM 'last_owner' THEN RAISE EXCEPTION 'P0E_LAST_OWNER_FAILED'; END IF;
 INSERT INTO qa_seat_proof VALUES('01_last_owner_blocked',outcome_value);
 IF EXISTS(SELECT 1 FROM public.enterprise_seat_operations WHERE organization_id=org AND idempotency_key='qa-single-owner-0001') THEN
  RAISE EXCEPTION 'P0E_LAST_OWNER_LEASE_LEAK';
 END IF;
 INSERT INTO public.organization_members(id,organization_id,user_id,role,seat_type,status)
 VALUES(m2,org,u2,'owner','full','active'),(m3,org,u3,'admin','full','active');
 SELECT f.outcome INTO outcome_value FROM public.release_organization_seat_atomic(org,m2,u3,'qa-admin-owner-0002','admin') f;
 IF outcome_value IS DISTINCT FROM 'permission_denied' THEN RAISE EXCEPTION 'P0E_ADMIN_OWNER_FAILED'; END IF;
 INSERT INTO qa_seat_proof VALUES('02_admin_owner_denied',outcome_value);
 IF EXISTS(SELECT 1 FROM public.enterprise_seat_operations WHERE organization_id=org AND idempotency_key='qa-admin-owner-0002') THEN
  RAISE EXCEPTION 'P0E_ADMIN_OWNER_LEASE_LEAK';
 END IF;
 SELECT f.outcome,f.active_members INTO outcome_value,count_value
 FROM public.release_organization_seat_atomic(org,m2,u1,'qa-owner-scim-0003','scim') f;
 IF outcome_value IS DISTINCT FROM 'released' OR count_value<>2
    OR NOT EXISTS(SELECT 1 FROM public.organization_members WHERE id=m2 AND status='deprovisioned') THEN
   RAISE EXCEPTION 'P0E_AUTHORIZED_SCIM_FAILED';
 END IF;
 INSERT INTO qa_seat_proof VALUES('03_owner_scim_allowed',outcome_value);
 SELECT active_members INTO count_value FROM public.organization_usage WHERE organization_id=org;
 IF count_value<>2 THEN RAISE EXCEPTION 'P0F_USAGE_COUNTER_FAILED'; END IF;
 INSERT INTO qa_seat_proof VALUES('04_usage_reconciled',count_value::text);
 SELECT count(*)::integer INTO count_value FROM public.audit_logs WHERE organization_id=org AND action='enterprise.seat_released';
 IF count_value<>1 THEN RAISE EXCEPTION 'P0E_EXACT_AUDIT_FAILED'; END IF;
 INSERT INTO qa_seat_proof VALUES('05_exactly_one_audit',count_value::text);
 SELECT f.outcome INTO outcome_value FROM public.release_organization_seat_atomic(org,m2,u1,'qa-owner-scim-0003','scim') f;
 IF outcome_value IS DISTINCT FROM 'duplicate' THEN RAISE EXCEPTION 'P0E_IDEMPOTENCY_FAILED'; END IF;
 INSERT INTO qa_seat_proof VALUES('06_duplicate_denied',outcome_value);
 SELECT f.outcome INTO outcome_value FROM public.release_organization_seat_atomic(org,m1,u1,'qa-last-owner-0004','admin') f;
 IF outcome_value IS DISTINCT FROM 'last_owner' THEN RAISE EXCEPTION 'P0E_REMAINING_OWNER_FAILED'; END IF;
 INSERT INTO qa_seat_proof VALUES('07_remaining_owner_protected',outcome_value);
END $qa$;
SELECT test_case,outcome FROM qa_seat_proof ORDER BY test_case;
ROLLBACK;
-- Follow with read-only: SELECT count(*) FROM public.organizations WHERE name='QA_SYNTHTEST_P0E_ROLLBACK';
