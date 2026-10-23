-- RISCK G1: READ-ONLY synthetic Clerk subject tenant A/B isolation smoke.
-- Run ONLY against the existing isolated QA after verifying migration
-- 20261023114116_g3_two_tenant_clerk_compatible_synthetic_fixture_20261023.
-- Never run in production. Requires exactly two synthetic organizations,
-- five active synthetic memberships, zero Auth users.
-- This is SQL RLS/role proof, NOT signed JWT/browser/API/Storage E2E.
-- Uses one outer transaction and always rolls back. Does not write rows.
BEGIN;
DO $g1_qa_rls$
DECLARE
 org_a uuid;
 org_b uuid;
 sub_a text;
 sub_b text;
 orgs_seen integer;
 memberships_seen integer;
 own_seen integer;
 other_seen integer;
 principal text;
 i integer;
BEGIN
 IF (SELECT count(*) FROM auth.users)<>0
    OR (SELECT count(*) FROM public.organizations)<>2
    OR (SELECT count(*) FROM public.organization_members)<>5
    OR NOT EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version='20261023114116'
    )
 THEN RAISE EXCEPTION 'G1 QA fixture guard refused: not the isolated two-tenant target'; END IF;

 SELECT organization_id,clerk_user_id INTO org_a,sub_a
 FROM public.organization_members
 WHERE lower(role)='owner' AND lower(status)='active'
   AND clerk_user_id IS NOT NULL
 ORDER BY organization_id LIMIT 1;

 SELECT organization_id,clerk_user_id INTO org_b,sub_b
 FROM public.organization_members
 WHERE lower(role)='owner' AND lower(status)='active'
   AND clerk_user_id IS NOT NULL AND organization_id<>org_a
 ORDER BY organization_id LIMIT 1;

 IF org_a IS NULL OR org_b IS NULL
  OR sub_a IS NULL OR sub_b IS NULL OR sub_a=sub_b
 THEN RAISE EXCEPTION 'G1 QA fixture guard refused: two distinct owners required'; END IF;

 -- Case 1: tenant A owner; case 2: tenant B owner;
 -- case 3: outsider; case 4: no JWT subject.
 FOR i IN 1..4 LOOP
  principal:=CASE i
   WHEN 1 THEN sub_a
   WHEN 2 THEN sub_b
   WHEN 3 THEN 'qa-outsider-no-membership-v1'
   ELSE '' END;
  PERFORM set_config('request.jwt.claim.sub',principal,true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN i=4 THEN '{}'
    ELSE jsonb_build_object('sub',principal,'aal','aal2','role','authenticated')::text
    END,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF current_user <> 'authenticated'
  THEN RAISE EXCEPTION 'G1 QA did not assume authenticated role'; END IF;
  EXECUTE 'SELECT count(*) FROM public.organizations' INTO orgs_seen;
  EXECUTE 'SELECT count(*) FROM public.organization_members' INTO memberships_seen;
  EXECUTE 'SELECT count(*) FROM public.organizations WHERE id=$1'
    INTO own_seen USING CASE WHEN i=2 THEN org_b ELSE org_a END;
  EXECUTE 'SELECT count(*) FROM public.organizations WHERE id=$1'
    INTO other_seen USING CASE WHEN i=2 THEN org_a ELSE org_b END;
  EXECUTE 'RESET ROLE';

  IF i IN (1,2) AND
      (orgs_seen<>1 OR own_seen<>1 OR other_seen<>0 OR memberships_seen<1)
  THEN RAISE EXCEPTION
      'G1 QA RLS owner scenario % failed (orgs %,own %,other %,members %)',
      i,orgs_seen,own_seen,other_seen,memberships_seen;
  END IF;
  IF i IN (3,4) AND
     (orgs_seen<>0 OR own_seen<>0 OR other_seen<>0 OR memberships_seen<>0)
  THEN RAISE EXCEPTION 'G1 QA RLS outsider/no-JWT scenario % leaked data',i;
  END IF;
 END LOOP;
END $g1_qa_rls$;
ROLLBACK;
SELECT 'G1_QA_SQL_RLS_A_B_OUTSIDER_NO_JWT_4_4_PASS'::text AS result;