-- RISCK G1: 5 assertions on real SQL RLS/RBAC, synthetic Clerk QA only.
-- Must target isolated G3 QA fixture (2 orgs, 5 memberships, zero Auth).
-- Explicit role switch to authenticated and outer ROLLBACK.
-- No production, customer data, privileged key, mutation or JWT API claim.
BEGIN;
DO $g1_role_proof$
DECLARE
 org_a uuid; org_b uuid; owner_sub text; member_sub text;
 owner_allowed boolean; owner_cross boolean;
 member_owner_allowed boolean; member_self boolean; member_cross boolean;
BEGIN
 IF (SELECT count(*) FROM public.organizations)<>2
 OR (SELECT count(*) FROM public.organization_members)<>5
 OR EXISTS (SELECT 1 FROM auth.users)
 OR NOT EXISTS (
   SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261023114116'
 )
 THEN RAISE EXCEPTION 'G1 QA RBAC synthetic fixture missing'; END IF;
 SELECT organization_id INTO org_a FROM public.organization_members
 GROUP BY organization_id
 HAVING count(*) FILTER(WHERE role='owner')>=1
 AND count(*) FILTER(WHERE role='member')>=1 LIMIT 1;
 SELECT id INTO org_b FROM public.organizations WHERE id<>org_a LIMIT 1;
 SELECT clerk_user_id INTO owner_sub FROM public.organization_members
 WHERE organization_id=org_a AND role='owner' ORDER BY id LIMIT 1;
 SELECT clerk_user_id INTO member_sub FROM public.organization_members
 WHERE organization_id=org_a AND role='member' ORDER BY id LIMIT 1;
 IF org_a IS NULL OR org_b IS NULL OR owner_sub IS NULL OR member_sub IS NULL THEN
 RAISE EXCEPTION 'G1 RBAC distinct fixture owner/member unavailable'; END IF;

 PERFORM set_config('request.jwt.claim.sub',owner_sub,true);
 PERFORM set_config('request.jwt.claims',
 jsonb_build_object('sub',owner_sub,'aal','aal2','role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF current_user<>'authenticated' THEN RAISE EXCEPTION 'Authenticated role not applied'; END IF;
 EXECUTE 'SELECT app_private.has_org_role($1,ARRAY[''owner'',''admin'']::text[])'
 INTO owner_allowed USING org_a;
 EXECUTE 'SELECT app_private.has_org_role($1,ARRAY[''owner'',''admin'']::text[])'
 INTO owner_cross USING org_b;
 EXECUTE 'RESET ROLE';

 PERFORM set_config('request.jwt.claim.sub',member_sub,true);
 PERFORM set_config('request.jwt.claims',
 jsonb_build_object('sub',member_sub,'aal','aal2','role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 EXECUTE 'SELECT app_private.has_org_role($1,ARRAY[''owner'',''admin'']::text[])'
 INTO member_owner_allowed USING org_a;
 EXECUTE 'SELECT app_private.is_org_member($1)' INTO member_self USING org_a;
 EXECUTE 'SELECT app_private.is_org_member($1)' INTO member_cross USING org_b;
 EXECUTE 'RESET ROLE';

 IF owner_allowed IS DISTINCT FROM TRUE OR owner_cross IS DISTINCT FROM FALSE
 OR member_owner_allowed IS DISTINCT FROM FALSE
 OR member_self IS DISTINCT FROM TRUE OR member_cross IS DISTINCT FROM FALSE THEN
 RAISE EXCEPTION 'G1 QA RBAC FAIL (owner %,cross %,member_owner %,self %,cross %)',
 owner_allowed,owner_cross,member_owner_allowed,member_self,member_cross;
 END IF;
END $g1_role_proof$;
ROLLBACK;
SELECT 'G1_QA_SQL_ROLE_OWNER_MEMBER_CROSS_TENANT_5_ASSERTIONS_PASS' AS result;