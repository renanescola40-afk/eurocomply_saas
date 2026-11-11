-- RISCK COMPLY VE1: persisted 20261105185729 QA Clerk-safe Enterprise helpers regression.
-- Designed for isolated QA with existing two Clerk tenants and MFA-required fixtures.
-- No signed JWT is created. BEGIN READ ONLY enforces zero data/DDL writes.
BEGIN READ ONLY;
DO $fixture$
DECLARE a uuid; b uuid; sa text; sb text;
BEGIN
 SELECT organization_id,clerk_user_id INTO a,sa FROM public.organization_members
 WHERE lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL
 ORDER BY organization_id,clerk_user_id LIMIT 1;
 SELECT organization_id,clerk_user_id INTO b,sb FROM public.organization_members
 WHERE lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL AND organization_id<>a
 ORDER BY organization_id,clerk_user_id LIMIT 1;
 IF a IS NULL OR b IS NULL OR a=b OR sa IS NULL OR sb IS NULL THEN
  RAISE EXCEPTION 'VE1 QA Clerk two-tenant fixture incomplete'; END IF;
 IF (SELECT count(*) FROM public.organization_security_settings
 WHERE organization_id IN (a,b) AND require_mfa_for_all_users)<>2 THEN
  RAISE EXCEPTION 'VE1 QA MFA required for both tenant fixtures'; END IF;
 PERFORM set_config('ve1.a',a::text,true); PERFORM set_config('ve1.b',b::text,true);
 PERFORM set_config('ve1.sa',sa,true); PERFORM set_config('ve1.sb',sb,true);
END $fixture$;
SET LOCAL ROLE authenticated;
DO $verify$
DECLARE i integer; own_org uuid; foreign_org uuid; sub text; expected_manage boolean; checks integer:=0;
BEGIN
 IF current_user<>'authenticated' THEN RAISE EXCEPTION 'Unexpected role'; END IF;
 FOR i IN 1..2 LOOP
  IF i=1 THEN own_org:=current_setting('ve1.a')::uuid; foreign_org:=current_setting('ve1.b')::uuid; sub:=current_setting('ve1.sa');
  ELSE own_org:=current_setting('ve1.b')::uuid; foreign_org:=current_setting('ve1.a')::uuid; sub:=current_setting('ve1.sb'); END IF;
  PERFORM set_config('request.jwt.claim.sub',sub,true);
  PERFORM set_config('request.jwt.claims',json_build_object('sub',sub,'role','authenticated','aal','aal2')::text,true);
  IF app_private.enterprise_member_can_read(own_org) IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'AAL2 own read denied %',i; END IF; checks:=checks+1;
  expected_manage:=app_private.has_org_role(own_org,ARRAY['owner','admin','editor','compliance_manager']);
  IF app_private.enterprise_member_can_manage(own_org) IS DISTINCT FROM expected_manage THEN RAISE EXCEPTION 'Own role mismatch %',i; END IF; checks:=checks+1;
  IF app_private.enterprise_member_can_read(foreign_org) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'AAL2 cross-tenant read %',i; END IF; checks:=checks+1;
  IF app_private.enterprise_member_can_manage(foreign_org) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'AAL2 cross-tenant manage %',i; END IF; checks:=checks+1;
  IF app_private.enterprise_member_can_read(NULL::uuid) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'NULL read %',i; END IF; checks:=checks+1;
  IF app_private.enterprise_member_can_manage(NULL::uuid) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'NULL manage %',i; END IF; checks:=checks+1;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',sub,'role','authenticated','aal','aal1')::text,true);
  IF app_private.enterprise_member_can_read(own_org) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'AAL1 own read %',i; END IF; checks:=checks+1;
  IF app_private.enterprise_member_can_manage(own_org) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'AAL1 own manage %',i; END IF; checks:=checks+1;
  IF app_private.enterprise_member_can_read(foreign_org) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'AAL1 foreign read %',i; END IF; checks:=checks+1;
  IF app_private.enterprise_member_can_manage(foreign_org) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'AAL1 foreign manage %',i; END IF; checks:=checks+1;
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub','user_ve1_nonmember_20261105',true);
 PERFORM set_config('request.jwt.claims','{"sub":"user_ve1_nonmember_20261105","aal":"aal2","role":"authenticated"}',true);
 IF app_private.enterprise_member_can_read(current_setting('ve1.a')::uuid) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Unknown user A read'; END IF; checks:=checks+1;
 IF app_private.enterprise_member_can_manage(current_setting('ve1.a')::uuid) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Unknown user A manage'; END IF; checks:=checks+1;
 IF app_private.enterprise_member_can_read(current_setting('ve1.b')::uuid) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Unknown user B read'; END IF; checks:=checks+1;
 IF app_private.enterprise_member_can_manage(current_setting('ve1.b')::uuid) IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'Unknown user B manage'; END IF; checks:=checks+1;
 IF checks<>24 THEN RAISE EXCEPTION 'Unexpected assertion count %',checks; END IF;
END $verify$;
RESET ROLE;
ROLLBACK;
SELECT json_build_object('suite','VE1_PERSISTED_CLERK_SAFE_HELPERS_QA','assertions_passed',24,
 'qa_migration_version','20261105185729','qa_environment','zrxrrfbllsxtleyxjpsz',
 'signed_jwt_e2e','NOT_VERIFIED','persistent_test_writes',false,
 'formal_gate_acceptance','NOT_ACCEPTED') AS regression_result;
