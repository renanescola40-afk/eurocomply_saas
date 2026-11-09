-- RISCK COMPLY / A-03 SEC-03: real RLS tenant-isolation / MFA QA smoke.
-- QA project ONLY: zrxrrfbllsxtleyxjpsz. No customer data, emails or production.
-- Source invariant: two synthetic QA organizations, 5 synthetic members.
-- No lasting writes: transactional role/GUC changes with mandatory ROLLBACK.
BEGIN;
SET LOCAL statement_timeout = '8000ms';
SET LOCAL lock_timeout = '1500ms';
DO $fixture$
DECLARE own_org uuid; other_org uuid; owner_sub text;
BEGIN
  IF (SELECT count(*) FROM public.organizations) <> 2
    OR (SELECT count(*) FROM public.organization_members
        WHERE clerk_user_id LIKE 'qa-%' AND user_id IS NULL AND status='active') <> 5
    OR (SELECT count(*) FROM public.organization_security_settings
        WHERE require_mfa_for_all_users) <> 2
  THEN RAISE EXCEPTION 'SEC03_QA_FIXTURE_MISMATCH'; END IF;
  SELECT organization_id,clerk_user_id INTO own_org,owner_sub
  FROM public.organization_members
  WHERE clerk_user_id LIKE 'qa-%' AND role='owner' AND status='active'
  ORDER BY organization_id,id LIMIT 1;
  SELECT id INTO other_org FROM public.organizations WHERE id <> own_org LIMIT 1;
  IF own_org IS NULL OR other_org IS NULL OR owner_sub IS NULL
  THEN RAISE EXCEPTION 'SEC03_QA_OWNER_OR_TENANT_MISSING'; END IF;
  PERFORM set_config('qa.sec03.own',own_org::text,true);
  PERFORM set_config('qa.sec03.foreign',other_org::text,true);
  PERFORM set_config('qa.sec03.subject',owner_sub,true);
END $fixture$;
SET LOCAL ROLE authenticated;
DO $assert$
DECLARE own_org uuid:=current_setting('qa.sec03.own')::uuid;
 other_org uuid:=current_setting('qa.sec03.foreign')::uuid;
 owner_sub text:=current_setting('qa.sec03.subject');
BEGIN
  IF current_setting('role',true) <> 'authenticated'
  THEN RAISE EXCEPTION 'SEC03_QA_ROLE_NOT_AUTHENTICATED'; END IF;
  -- Positive control ensures the test cannot PASS merely because all rows are hidden.
  PERFORM set_config('request.jwt.claim.sub',owner_sub,true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',owner_sub,'role','authenticated','aal','aal2')::text,true);
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id=own_org)
    OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=own_org)
  THEN RAISE EXCEPTION 'SEC03_QA_OWN_TENANT_POSITIVE_ACCESS_FAILED'; END IF;
  IF EXISTS (SELECT 1 FROM public.organizations WHERE id=other_org)
    OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=other_org)
  THEN RAISE EXCEPTION 'SEC03_QA_CROSS_TENANT_READ_LEAK'; END IF;

  -- MFA AAL1 must not satisfy the target tenant's tenant-wide AAL2 requirement.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',owner_sub,'role','authenticated','aal','aal1')::text,true);
  IF EXISTS (SELECT 1 FROM public.organizations WHERE id=own_org)
    OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=own_org)
  THEN RAISE EXCEPTION 'SEC03_QA_AAL1_TENANT_READ_BYPASS'; END IF;

  -- Unrelated, AAL2-authenticated principal remains unable to read either tenant.
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-4000-8000-000000000000","role":"authenticated","aal":"aal2"}',true);
  IF EXISTS (SELECT 1 FROM public.organizations WHERE id IN (own_org,other_org))
    OR EXISTS (SELECT 1 FROM public.organization_members
               WHERE organization_id IN (own_org,other_org))
  THEN RAISE EXCEPTION 'SEC03_QA_OUTSIDER_READ_LEAK'; END IF;
END $assert$;
RESET ROLE;
ROLLBACK;
SELECT 'QA_SEC03_RLS_TENANT_AAL2_ROLLBACK_PASS'::text AS result;
