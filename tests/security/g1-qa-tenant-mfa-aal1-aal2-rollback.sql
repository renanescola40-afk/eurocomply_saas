-- RISCK G1 — SQL-only MFA verification with rollback (isolated synthetic QA).
-- Do not apply in production. Mandatory guard: G3 QA fixture migration
-- 20261023114116, exactly two synthetic organizations, five memberships,
-- and zero Auth users. Transaction simulates AAL1/AAL2 only: not Auth E2E.
-- A temporary QA security-settings update is rolled back. No emails, secrets or customers.
BEGIN;
SET LOCAL lock_timeout='500ms';
SET LOCAL statement_timeout='10s';
DO $g1_mfa_guard$
DECLARE org_a uuid; sub_a text; denied int; allowed int; outsider int;
BEGIN
 IF (SELECT count(*) FROM public.organizations)<>2
 OR (SELECT count(*) FROM public.organization_members)<>5
 OR EXISTS(SELECT 1 FROM auth.users)
 OR NOT EXISTS (
 SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261023114116'
 ) THEN RAISE EXCEPTION 'MFA isolated QA fixture guard refused'; END IF;
 SELECT organization_id,clerk_user_id INTO org_a,sub_a
 FROM public.organization_members
 WHERE role='owner' AND status='active' AND clerk_user_id IS NOT NULL
 ORDER BY organization_id LIMIT 1;
 IF org_a IS NULL OR sub_a IS NULL THEN
 RAISE EXCEPTION 'MFA QA fixture owner unavailable'; END IF;

 INSERT INTO public.organization_security_settings(organization_id,require_mfa_for_all_users)
 VALUES (org_a,true)
 ON CONFLICT (organization_id) DO UPDATE SET require_mfa_for_all_users=true;

 PERFORM set_config('request.jwt.claim.sub',sub_a,true);
 PERFORM set_config('request.jwt.claims',
 jsonb_build_object('sub',sub_a,'aal','aal1','role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF current_user<>'authenticated' THEN RAISE EXCEPTION 'Authenticated SQL role not active'; END IF;
 EXECUTE 'SELECT count(*) FROM public.organizations WHERE id=$1' INTO denied USING org_a;
 EXECUTE 'RESET ROLE';

 PERFORM set_config('request.jwt.claims',
 jsonb_build_object('sub',sub_a,'aal','aal2','role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 EXECUTE 'SELECT count(*) FROM public.organizations WHERE id=$1' INTO allowed USING org_a;
 EXECUTE 'RESET ROLE';

 PERFORM set_config('request.jwt.claim.sub','qa-outsider-no-membership',true);
 PERFORM set_config('request.jwt.claims',
 '{"sub":"qa-outsider-no-membership","aal":"aal2","role":"authenticated"}',true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 EXECUTE 'SELECT count(*) FROM public.organizations WHERE id=$1' INTO outsider USING org_a;
 EXECUTE 'RESET ROLE';

 IF denied<>0 OR allowed<>1 OR outsider<>0 THEN
 RAISE EXCEPTION 'G1 QA MFA RLS contract failed (AAL1=%,AAL2=%,outsider=%)',
 denied,allowed,outsider;
 END IF;
END $g1_mfa_guard$;
ROLLBACK;
SELECT 'G1_QA_SQL_TENANT_MFA_AAL1_DENY_AAL2_ALLOW_OUTSIDER_DENY_PASS' AS result;