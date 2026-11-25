-- Isolated QA zrxrrfbllsxtleyxjpsz only. No data writes, no DDL.
-- Real PostgreSQL RLS with transaction-local simulated claims.
-- NOT signed JWT, HTTP, commercial entitlement, or Storage proof.
BEGIN READ ONLY;
SET LOCAL statement_timeout='8000ms';
DO $fixture$
DECLARE a uuid; b uuid; ua uuid; ub uuid;
BEGIN
 IF (SELECT count(*) FROM public.organizations)<>2
 OR (SELECT count(*) FROM public.organization_security_settings WHERE require_mfa_for_all_users)<>2
 OR (SELECT count(DISTINCT m.organization_id) FROM public.organization_members m JOIN auth.users u ON u.id=m.user_id WHERE m.status='active')<>2
 OR EXISTS(SELECT 1 FROM public.organization_members WHERE user_id IS NOT NULL AND status='active' GROUP BY user_id HAVING count(DISTINCT organization_id)>1)
 THEN RAISE EXCEPTION 'QA_UUID_RLS_FIXTURE_REFUSED'; END IF;
 SELECT m.organization_id,m.user_id INTO STRICT a,ua FROM public.organization_members m JOIN auth.users u ON u.id=m.user_id WHERE m.status='active' ORDER BY m.organization_id,m.id LIMIT 1;
 SELECT m.organization_id,m.user_id INTO STRICT b,ub FROM public.organization_members m JOIN auth.users u ON u.id=m.user_id WHERE m.status='active' AND m.organization_id<>a ORDER BY m.id LIMIT 1;
 IF ua=ub OR a=b THEN RAISE EXCEPTION 'QA_UUID_RLS_NOT_DISTINCT'; END IF;
 PERFORM set_config('risck_qa.org_a',a::text,true);
 PERFORM set_config('risck_qa.org_b',b::text,true);
 PERFORM set_config('risck_qa.user_a',ua::text,true);
 PERFORM set_config('risck_qa.user_b',ub::text,true);
END $fixture$;
SET LOCAL ROLE authenticated;
DO $checks$
DECLARE i int; own_org uuid; other_org uuid; actor uuid; n int:=0;
BEGIN
 IF current_user<>'authenticated' THEN RAISE EXCEPTION 'QA_WRONG_ROLE'; END IF;
 FOR i IN 1..2 LOOP
  own_org:=current_setting(CASE WHEN i=1 THEN 'risck_qa.org_a' ELSE 'risck_qa.org_b' END)::uuid;
  other_org:=current_setting(CASE WHEN i=1 THEN 'risck_qa.org_b' ELSE 'risck_qa.org_a' END)::uuid;
  actor:=current_setting(CASE WHEN i=1 THEN 'risck_qa.user_a' ELSE 'risck_qa.user_b' END)::uuid;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
  IF auth.uid() IS DISTINCT FROM actor THEN RAISE EXCEPTION 'QA_SUB_MISMATCH'; END IF; n:=n+1;
  IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=own_org) THEN RAISE EXCEPTION 'QA_OWN_ORG_DENIED'; END IF; n:=n+1;
  IF EXISTS(SELECT 1 FROM public.organizations WHERE id=other_org) THEN RAISE EXCEPTION 'QA_CROSS_ORG_EXPOSED'; END IF; n:=n+1;
  IF NOT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=own_org AND user_id=actor) THEN RAISE EXCEPTION 'QA_OWN_MEMBERSHIP_DENIED'; END IF; n:=n+1;
  IF EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=other_org) THEN RAISE EXCEPTION 'QA_CROSS_MEMBERSHIP_EXPOSED'; END IF; n:=n+1;
  IF app_private.is_org_member(own_org) IS DISTINCT FROM true THEN RAISE EXCEPTION 'QA_OWN_HELPER_DENIED'; END IF; n:=n+1;
  IF app_private.is_org_member(other_org) IS DISTINCT FROM false THEN RAISE EXCEPTION 'QA_CROSS_HELPER_ALLOWED'; END IF; n:=n+1;
  IF app_private.has_org_role(other_org,ARRAY['owner','admin','editor','compliance_manager','member','viewer']) IS DISTINCT FROM false THEN RAISE EXCEPTION 'QA_CROSS_ROLE_ALLOWED'; END IF; n:=n+1;
  IF app_private.has_commercial_authority(other_org) IS DISTINCT FROM false THEN RAISE EXCEPTION 'QA_CROSS_COMMERCIAL_ALLOWED'; END IF; n:=n+1;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
  IF app_private.is_org_member(own_org) IS DISTINCT FROM false THEN RAISE EXCEPTION 'QA_AAL1_HELPER_ALLOWED'; END IF; n:=n+1;
  IF EXISTS(SELECT 1 FROM public.organizations WHERE id IN (own_org,other_org)) THEN RAISE EXCEPTION 'QA_AAL1_ORG_EXPOSED'; END IF; n:=n+1;
  IF EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id IN (own_org,other_org)) THEN RAISE EXCEPTION 'QA_AAL1_MEMBERSHIP_EXPOSED'; END IF; n:=n+1;
 END LOOP;
 IF n<>24 THEN RAISE EXCEPTION 'QA_COUNT_MISMATCH'; END IF;
 PERFORM set_config('risck_qa.rls_uuid_count',n::text,true);
END $checks$;
RESET ROLE;
SELECT current_setting('risck_qa.rls_uuid_count',true)::int AS assertions_passed,24 AS expected,'SQL_RLS_SIMULATED_CLAIMS_NOT_SIGNED_HTTP' AS evidence_class;
ROLLBACK;
