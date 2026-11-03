-- Isolated QA ONLY. Execute after the matching forward migration's BODY
-- inside the SAME BEGIN/ROLLBACK transaction, never commit the rehearsal.
-- Uses preexisting QA synthetic membership data in a temp table. No subjects
-- or tenant IDs are logged. This simulates JWT claims, NOT signed JWT E2E.
CREATE TEMP TABLE clerk_enterprise_rehearsal_20261103 ON COMMIT DROP AS
SELECT organization_id::uuid AS tenant_id, clerk_user_id AS subject, lower(role) AS user_role
FROM public.organization_members
WHERE lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL;
GRANT SELECT ON TABLE pg_temp.clerk_enterprise_rehearsal_20261103 TO authenticated;
SET LOCAL ROLE authenticated;
DO $verify_enterprise_clerk$
DECLARE
 actor record;
 owner_fixture record;
 other_tenant uuid;
 assurance text;
 own_read boolean; own_manage boolean; cross_read boolean; cross_manage boolean;
 expected_read boolean; expected_manage boolean;
 decision boolean;
 n integer := 0;
 fixture_count integer; tenant_count integer;
BEGIN
 SELECT count(*),count(distinct tenant_id) INTO fixture_count,tenant_count
 FROM pg_temp.clerk_enterprise_rehearsal_20261103;
 IF fixture_count<>5 OR tenant_count<>2 THEN
   RAISE EXCEPTION 'Expected 5 isolated QA fixture memberships over 2 tenants';
 END IF;
 FOR actor IN SELECT tenant_id,subject,user_role
    FROM pg_temp.clerk_enterprise_rehearsal_20261103 ORDER BY tenant_id,subject
 LOOP
   SELECT tenant_id INTO other_tenant
   FROM pg_temp.clerk_enterprise_rehearsal_20261103
   WHERE tenant_id<>actor.tenant_id ORDER BY tenant_id LIMIT 1;
   IF other_tenant IS NULL THEN RAISE EXCEPTION 'Other tenant fixture missing'; END IF;
   FOREACH assurance IN ARRAY ARRAY['aal1','aal2'] LOOP
     PERFORM set_config('request.jwt.claim.sub',actor.subject,true);
     PERFORM set_config('request.jwt.claims',
       jsonb_build_object('sub',actor.subject,'aal',assurance)::text,true);
     SELECT app_private.enterprise_member_can_read(actor.tenant_id),
            app_private.enterprise_member_can_manage(actor.tenant_id),
            app_private.enterprise_member_can_read(other_tenant),
            app_private.enterprise_member_can_manage(other_tenant)
       INTO own_read,own_manage,cross_read,cross_manage;
     expected_read := assurance='aal2';
     expected_manage := expected_read AND actor.user_role=ANY(
       ARRAY['owner','admin','editor','compliance_manager']);
     IF own_read IS DISTINCT FROM expected_read
       OR own_manage IS DISTINCT FROM expected_manage
       OR cross_read IS DISTINCT FROM false
       OR cross_manage IS DISTINCT FROM false THEN
       RAISE EXCEPTION 'QA Enterprise tenant/role/MFA case failed: %',n+1;
     END IF;
     n := n+1;
   END LOOP;
 END LOOP;
 SELECT tenant_id,subject INTO owner_fixture
 FROM pg_temp.clerk_enterprise_rehearsal_20261103
 WHERE user_role='owner' ORDER BY tenant_id,subject LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'QA owner fixture missing'; END IF;
  -- no-identity-read
  PERFORM set_config('request.jwt.claim.sub','',true);
  PERFORM set_config('request.jwt.claims','{}',true);
  SELECT app_private.enterprise_member_can_read(owner_fixture.tenant_id) INTO decision;
  IF decision IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: no-identity-read';
  END IF;
  n := n + 1;
  -- no-identity-manage
  PERFORM set_config('request.jwt.claim.sub','',true);
  PERFORM set_config('request.jwt.claims','{}',true);
  SELECT app_private.enterprise_member_can_manage(owner_fixture.tenant_id) INTO decision;
  IF decision IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: no-identity-manage';
  END IF;
  n := n + 1;
  -- unknown-identity-read
  PERFORM set_config('request.jwt.claim.sub','qa-unknown-identity-test-subject',true);
  PERFORM set_config('request.jwt.claims','{"sub":"qa-unknown-identity-test-subject","aal":"aal2"}',true);
  SELECT app_private.enterprise_member_can_read(owner_fixture.tenant_id) INTO decision;
  IF decision IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: unknown-identity-read';
  END IF;
  n := n + 1;
  -- unknown-identity-manage
  PERFORM set_config('request.jwt.claim.sub','qa-unknown-identity-test-subject',true);
  PERFORM set_config('request.jwt.claims','{"sub":"qa-unknown-identity-test-subject","aal":"aal2"}',true);
  SELECT app_private.enterprise_member_can_manage(owner_fixture.tenant_id) INTO decision;
  IF decision IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: unknown-identity-manage';
  END IF;
  n := n + 1;
  -- null-org-read
  PERFORM set_config('request.jwt.claim.sub','qa-unknown-identity-test-subject',true);
  PERFORM set_config('request.jwt.claims','{"sub":"qa-unknown-identity-test-subject","aal":"aal2"}',true);
  SELECT app_private.enterprise_member_can_read(null::uuid) INTO decision;
  IF decision IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: null-org-read';
  END IF;
  n := n + 1;
  -- null-org-manage
  PERFORM set_config('request.jwt.claim.sub','qa-unknown-identity-test-subject',true);
  PERFORM set_config('request.jwt.claims','{"sub":"qa-unknown-identity-test-subject","aal":"aal2"}',true);
  SELECT app_private.enterprise_member_can_manage(null::uuid) INTO decision;
  IF decision IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: null-org-manage';
  END IF;
  n := n + 1;
  -- aal1-owner-read
  PERFORM set_config('request.jwt.claim.sub',owner_fixture.subject,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_fixture.subject,'aal','aal1')::text,true);
  SELECT app_private.enterprise_member_can_read(owner_fixture.tenant_id) INTO decision;
  IF decision IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: aal1-owner-read';
  END IF;
  n := n + 1;
  -- aal1-owner-manage
  PERFORM set_config('request.jwt.claim.sub',owner_fixture.subject,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_fixture.subject,'aal','aal1')::text,true);
  SELECT app_private.enterprise_member_can_manage(owner_fixture.tenant_id) INTO decision;
  IF decision IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: aal1-owner-manage';
  END IF;
  n := n + 1;
  -- aal2-owner-read
  PERFORM set_config('request.jwt.claim.sub',owner_fixture.subject,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_fixture.subject,'aal','aal2')::text,true);
  SELECT app_private.enterprise_member_can_read(owner_fixture.tenant_id) INTO decision;
  IF decision IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: aal2-owner-read';
  END IF;
  n := n + 1;
  -- aal2-owner-manage
  PERFORM set_config('request.jwt.claim.sub',owner_fixture.subject,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_fixture.subject,'aal','aal2')::text,true);
  SELECT app_private.enterprise_member_can_manage(owner_fixture.tenant_id) INTO decision;
  IF decision IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: aal2-owner-manage';
  END IF;
  n := n + 1;
  -- unknown-org-read
  PERFORM set_config('request.jwt.claim.sub',owner_fixture.subject,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_fixture.subject,'aal','aal2')::text,true);
  SELECT app_private.enterprise_member_can_read('00000000-0000-4000-8000-000000000000'::uuid) INTO decision;
  IF decision IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: unknown-org-read';
  END IF;
  n := n + 1;
  -- unknown-org-manage
  PERFORM set_config('request.jwt.claim.sub',owner_fixture.subject,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_fixture.subject,'aal','aal2')::text,true);
  SELECT app_private.enterprise_member_can_manage('00000000-0000-4000-8000-000000000000'::uuid) INTO decision;
  IF decision IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'QA Enterprise negative/positive case failed: unknown-org-manage';
  END IF;
  n := n + 1;
 IF n<>22 THEN RAISE EXCEPTION 'Enterprise fixture coverage mismatch: %',n; END IF;
END
$verify_enterprise_clerk$;
RESET ROLE;
SELECT has_function_privilege('anon','app_private.enterprise_member_can_read(uuid)','EXECUTE') AS anon_read_exec,
       has_function_privilege('anon','app_private.enterprise_member_can_manage(uuid)','EXECUTE') AS anon_manage_exec,
       '22/22' AS verified_qa_cases;
