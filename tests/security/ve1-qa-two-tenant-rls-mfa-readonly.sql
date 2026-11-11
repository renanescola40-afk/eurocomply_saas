-- RISCK COMPLY VE1/A-01/A-03: reversible two-tenant RLS and simulated-AAL SQL verification.
-- QA FIXTURE ONLY. Executes SELECT and transaction-local settings; no INSERT/UPDATE/DELETE/DDL.
-- A simulated JWT claim is NOT a signed provider JWT. This is NOT full API/Storage E2E.
-- Requires exactly two QA organizations, five active Clerk memberships, MFA required for both.
BEGIN READ ONLY;
DO $fixture$
DECLARE a uuid; b uuid; sa text; sb text;
BEGIN
  IF (SELECT count(*) FROM public.organizations)<>2
     OR (SELECT count(*) FROM public.organization_members WHERE lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL)<>5
     OR (SELECT count(*) FROM public.organization_security_settings WHERE require_mfa_for_all_users)<>2
  THEN RAISE EXCEPTION 'VE1 QA-only fixture not present: refuse to proceed'; END IF;
  SELECT organization_id,clerk_user_id INTO a,sa FROM public.organization_members
    WHERE lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL
    ORDER BY organization_id,clerk_user_id LIMIT 1;
  SELECT organization_id,clerk_user_id INTO b,sb FROM public.organization_members
    WHERE lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL AND organization_id<>a
    ORDER BY organization_id,clerk_user_id LIMIT 1;
  IF a IS NULL OR b IS NULL OR sa IS NULL OR sb IS NULL THEN
    RAISE EXCEPTION 'VE1 QA fixture missing two separate active Clerk identities'; END IF;
  PERFORM set_config('ve1.org_a',a::text,true);
  PERFORM set_config('ve1.org_b',b::text,true);
  PERFORM set_config('ve1.subject_a',sa,true);
  PERFORM set_config('ve1.subject_b',sb,true);
END $fixture$;
SET LOCAL ROLE authenticated;
DO $assert$
DECLARE i integer; own_org uuid; other_org uuid; subject text; n integer; checks integer:=0;
BEGIN
  IF current_user<>'authenticated' THEN RAISE EXCEPTION 'VE1 SQL role mismatch'; END IF;
  -- SEC-03, 16 assertions: bidirectional tenant isolation and missing-identity denial.
  FOR i IN 1..2 LOOP
    IF i=1 THEN
      own_org:=current_setting('ve1.org_a')::uuid;
      other_org:=current_setting('ve1.org_b')::uuid;
      subject:=current_setting('ve1.subject_a');
    ELSE
      own_org:=current_setting('ve1.org_b')::uuid;
      other_org:=current_setting('ve1.org_a')::uuid;
      subject:=current_setting('ve1.subject_b');
    END IF;
    PERFORM set_config('request.jwt.claim.sub',subject,true);
    PERFORM set_config('request.jwt.claims',json_build_object('sub',subject,'role','authenticated','aal','aal2')::text,true);
    SELECT count(*) INTO n FROM public.organizations WHERE id=own_org;
    IF n<>1 THEN RAISE EXCEPTION 'VE1 SEC03 own org unavailable %',i; END IF; checks:=checks+1;
    SELECT count(*) INTO n FROM public.organizations WHERE id=other_org;
    IF n<>0 THEN RAISE EXCEPTION 'VE1 SEC03 cross-tenant org leak %',i; END IF; checks:=checks+1;
    SELECT count(*) INTO n FROM public.organization_members WHERE organization_id=own_org;
    IF n<1 THEN RAISE EXCEPTION 'VE1 SEC03 own membership unavailable %',i; END IF; checks:=checks+1;
    SELECT count(*) INTO n FROM public.organization_members WHERE organization_id=other_org;
    IF n<>0 THEN RAISE EXCEPTION 'VE1 SEC03 cross-tenant membership leak %',i; END IF; checks:=checks+1;
    IF app_private.is_org_member(own_org) IS DISTINCT FROM TRUE
    THEN RAISE EXCEPTION 'VE1 SEC03 own helper denied %',i; END IF; checks:=checks+1;
    IF app_private.is_org_member(other_org) IS DISTINCT FROM FALSE
    THEN RAISE EXCEPTION 'VE1 SEC03 other-org helper allowed %',i; END IF; checks:=checks+1;
  END LOOP;
  PERFORM set_config('request.jwt.claim.sub','user_ve1_nonmember_synthetic_20261104',true);
  PERFORM set_config('request.jwt.claims',json_build_object('sub','user_ve1_nonmember_synthetic_20261104','role','authenticated','aal','aal2')::text,true);
  SELECT count(*) INTO n FROM public.organizations;
  IF n<>0 THEN RAISE EXCEPTION 'VE1 SEC03 absent subject can view orgs'; END IF; checks:=checks+1;
  SELECT count(*) INTO n FROM public.organization_members;
  IF n<>0 THEN RAISE EXCEPTION 'VE1 SEC03 absent subject can view memberships'; END IF; checks:=checks+1;
  IF app_private.is_org_member(current_setting('ve1.org_a')::uuid) IS DISTINCT FROM FALSE
  THEN RAISE EXCEPTION 'VE1 SEC03 absent subject can access org A'; END IF; checks:=checks+1;
  IF app_private.is_org_member(current_setting('ve1.org_b')::uuid) IS DISTINCT FROM FALSE
  THEN RAISE EXCEPTION 'VE1 SEC03 absent subject can access org B'; END IF; checks:=checks+1;
  IF checks<>16 THEN RAISE EXCEPTION 'VE1 SEC03 test count %',checks; END IF;
  -- SEC-01/SEC-03, another 20 assertions: both tenants AAL1 denied, AAL2 positive/cross-denied.
  FOR i IN 1..2 LOOP
    IF i=1 THEN
      own_org:=current_setting('ve1.org_a')::uuid;
      other_org:=current_setting('ve1.org_b')::uuid;
      subject:=current_setting('ve1.subject_a');
    ELSE
      own_org:=current_setting('ve1.org_b')::uuid;
      other_org:=current_setting('ve1.org_a')::uuid;
      subject:=current_setting('ve1.subject_b');
    END IF;
    PERFORM set_config('request.jwt.claim.sub',subject,true);
    PERFORM set_config('request.jwt.claims',json_build_object('sub',subject,'role','authenticated','aal','aal1')::text,true);
    IF app_private.is_org_member(own_org) IS DISTINCT FROM FALSE
    THEN RAISE EXCEPTION 'VE1 SEC01 AAL1 member allowed %',i; END IF; checks:=checks+1;
    IF app_private.has_org_role(own_org,ARRAY['owner','admin','editor','compliance_manager','member','viewer']) IS DISTINCT FROM FALSE
    THEN RAISE EXCEPTION 'VE1 SEC01 AAL1 role allowed %',i; END IF; checks:=checks+1;
    SELECT count(*) INTO n FROM public.organizations WHERE id=own_org;
    IF n<>0 THEN RAISE EXCEPTION 'VE1 SEC01 AAL1 org visible %',i; END IF; checks:=checks+1;
    SELECT count(*) INTO n FROM public.organization_members WHERE organization_id=own_org;
    IF n<>0 THEN RAISE EXCEPTION 'VE1 SEC01 AAL1 memberships visible %',i; END IF; checks:=checks+1;
    SELECT count(*) INTO n FROM public.organizations WHERE id=other_org;
    IF n<>0 THEN RAISE EXCEPTION 'VE1 SEC01 AAL1 other org visible %',i; END IF; checks:=checks+1;
    PERFORM set_config('request.jwt.claims',json_build_object('sub',subject,'role','authenticated','aal','aal2')::text,true);
    IF app_private.is_org_member(own_org) IS DISTINCT FROM TRUE
    THEN RAISE EXCEPTION 'VE1 SEC01 AAL2 valid member denied %',i; END IF; checks:=checks+1;
    SELECT count(*) INTO n FROM public.organizations WHERE id=own_org;
    IF n<>1 THEN RAISE EXCEPTION 'VE1 SEC01 AAL2 own org invisible %',i; END IF; checks:=checks+1;
    SELECT count(*) INTO n FROM public.organization_members WHERE organization_id=own_org;
    IF n<1 THEN RAISE EXCEPTION 'VE1 SEC01 AAL2 own memberships invisible %',i; END IF; checks:=checks+1;
    SELECT count(*) INTO n FROM public.organizations WHERE id=other_org;
    IF n<>0 THEN RAISE EXCEPTION 'VE1 SEC01 AAL2 other org visible %',i; END IF; checks:=checks+1;
    SELECT count(*) INTO n FROM public.organization_members WHERE organization_id=other_org;
    IF n<>0 THEN RAISE EXCEPTION 'VE1 SEC01 AAL2 other memberships visible %',i; END IF; checks:=checks+1;
  END LOOP;
  IF checks<>36 THEN RAISE EXCEPTION 'VE1 total expected 36 assertions, got %',checks; END IF;
END $assert$;
RESET ROLE;
ROLLBACK;
SELECT json_build_object('test','VE1_QA_READONLY_RLS_AAL1_AAL2_TWO_TENANTS',
  'assertions_passed',36,
  'tenant_isolation_assertions',16,
  'sql_mfa_assertions',20,
  'organizations_after_rollback',(SELECT count(*) FROM public.organizations),
  'memberships_after_rollback',(SELECT count(*) FROM public.organization_members),
  'signed_jwt_e2e','NOT_VERIFIED',
  'api_storage_export_e2e','NOT_VERIFIED',
  'formal_acceptance','NOT_ACCEPTED') AS ve1_rehearsal_result;
