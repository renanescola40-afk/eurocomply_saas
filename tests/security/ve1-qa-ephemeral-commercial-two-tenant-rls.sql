-- VE1 / A-03 (SQL-only). Isolated QA fixture, not signed contract/billing/JWT evidence.
-- Tests two real QA Clerk owner fixtures against temporary AI inventory and document data.
-- The synthetic commercial source is rolled back; no real contract/payment or production write.
-- DO NOT execute against a production project. Prerequisite: empty QA resource/commercial rows.
BEGIN;
DO $qa_seed$
DECLARE o record;source_id uuid;fixture_num integer:=0;
BEGIN
 IF (SELECT count(*) FROM public.organizations)<>2
 OR (SELECT count(*) FROM public.enterprise_entitlement_sources)<>0
 OR (SELECT count(*) FROM public.enterprise_entitlement_snapshots)<>0
 OR (SELECT count(*) FROM public.ai_systems)<>0
 OR (SELECT count(*) FROM public.documents)<>0
 OR (SELECT count(*) FROM public.organizations WHERE app_private.has_commercial_authority(id))<>0
 OR (SELECT count(DISTINCT organization_id) FROM public.organization_members WHERE role='owner' AND lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL)<>2
 THEN RAISE EXCEPTION 'VE1 requires the existing isolated, empty 2-org QA fixtures';END IF;
 FOR o IN SELECT id FROM public.organizations ORDER BY id LOOP
   INSERT INTO public.enterprise_entitlement_sources(organization_id,source_kind,external_reference,priority,active,version,effective_from)
   VALUES(o.id,'signed_contract','QA_SYNTHETIC_NOT_A_CONTRACT_ROLLBACK_ONLY',999,true,1,now()-interval '1 hour')
   RETURNING id INTO source_id;
   INSERT INTO public.enterprise_entitlement_snapshots
    (organization_id,source_id,idempotency_key,source_version,plan_code,full_seat_limit,participant_seat_limit,viewer_seat_limit,entitlements,source_payload_sha256,observed_at,valid_from,status)
   VALUES(o.id,source_id,'ve1_qa_rollback_fixture_'||fixture_num,1,'professional',50,20,20,
    '{"qa_ephemeral":true,"no_real_contract_or_payment":true}'::jsonb,
    'a70b25758636717ca4587d3150f3a59fc59a88beb3533d909d752be52dc23000',now(),now()-interval '1 hour','applied');
   IF app_private.has_commercial_authority(o.id) IS DISTINCT FROM TRUE
   THEN RAISE EXCEPTION 'Ephemeral commercial precondition failed';END IF;
   INSERT INTO public.ai_systems(organization_id,name,use_case)
   VALUES(o.id,'VE1 QA synthetic inventory '||fixture_num,'Temporary QA test-only inventory to validate PostgreSQL RLS');
   INSERT INTO public.documents(organization_id,title,name)
   VALUES(o.id,'VE1 QA synthetic document '||fixture_num,'qa-document-test-'||fixture_num);
   fixture_num:=fixture_num+1;
 END LOOP;
 IF fixture_num<>2 OR (SELECT count(*) FROM public.ai_systems)<>2 OR (SELECT count(*) FROM public.documents)<>2
 THEN RAISE EXCEPTION 'Failed to seed exactly 2 temporary resources per table';END IF;
END $qa_seed$;
DO $qa_identity$
DECLARE a uuid;b uuid;sa text;sb text;
BEGIN
 SELECT organization_id,clerk_user_id INTO a,sa FROM public.organization_members
 WHERE role='owner' AND lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL
 ORDER BY organization_id,clerk_user_id LIMIT 1;
 SELECT organization_id,clerk_user_id INTO b,sb FROM public.organization_members
 WHERE role='owner' AND lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL
 AND organization_id<>a ORDER BY organization_id,clerk_user_id LIMIT 1;
 IF a IS NULL OR b IS NULL OR sa IS NULL OR sb IS NULL THEN RAISE EXCEPTION 'Missing real QA owner fixture';END IF;
 IF (SELECT count(*) FROM public.organization_security_settings WHERE require_mfa_for_all_users AND organization_id IN (a,b))<>2
 THEN RAISE EXCEPTION 'Both QA tenants must require MFA';END IF;
 PERFORM set_config('ve1.org_a',a::text,true);PERFORM set_config('ve1.org_b',b::text,true);
 PERFORM set_config('ve1.sub_a',sa,true);PERFORM set_config('ve1.sub_b',sb,true);
END $qa_identity$;
SET LOCAL ROLE authenticated;
DO $qa_rls$
DECLARE i integer;own_org uuid;other_org uuid;subject text;n integer;checks integer:=0;
BEGIN
 IF current_user<>'authenticated' THEN RAISE EXCEPTION 'Expected authenticated SQL role';END IF;
 FOR i IN 1..2 LOOP
 IF i=1 THEN own_org:=current_setting('ve1.org_a')::uuid;other_org:=current_setting('ve1.org_b')::uuid;subject:=current_setting('ve1.sub_a');
 ELSE own_org:=current_setting('ve1.org_b')::uuid;other_org:=current_setting('ve1.org_a')::uuid;subject:=current_setting('ve1.sub_b');END IF;
 PERFORM set_config('request.jwt.claim.sub',subject,true);
 PERFORM set_config('request.jwt.claims',json_build_object('sub',subject,'role','authenticated','aal','aal2')::text,true);
 SELECT count(*) INTO n FROM public.ai_systems WHERE organization_id=own_org;
 IF n<>1 THEN RAISE EXCEPTION 'AAL2 owned AI invisible %',i;END IF;checks:=checks+1;
 SELECT count(*) INTO n FROM public.ai_systems WHERE organization_id=other_org;
 IF n<>0 THEN RAISE EXCEPTION 'AAL2 cross-tenant AI leaked %',i;END IF;checks:=checks+1;
 SELECT count(*) INTO n FROM public.documents WHERE organization_id=own_org;
 IF n<>1 THEN RAISE EXCEPTION 'AAL2 owned document invisible %',i;END IF;checks:=checks+1;
 SELECT count(*) INTO n FROM public.documents WHERE organization_id=other_org;
 IF n<>0 THEN RAISE EXCEPTION 'AAL2 cross-tenant document leaked %',i;END IF;checks:=checks+1;
 PERFORM set_config('request.jwt.claims',json_build_object('sub',subject,'role','authenticated','aal','aal1')::text,true);
 SELECT count(*) INTO n FROM public.ai_systems WHERE organization_id=own_org;
 IF n<>0 THEN RAISE EXCEPTION 'AAL1 owned AI exposed %',i;END IF;checks:=checks+1;
 SELECT count(*) INTO n FROM public.documents WHERE organization_id=own_org;
 IF n<>0 THEN RAISE EXCEPTION 'AAL1 owned document exposed %',i;END IF;checks:=checks+1;
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub','user_ve1_nonmember_qa',true);
 PERFORM set_config('request.jwt.claims','{"sub":"user_ve1_nonmember_qa","aal":"aal2","role":"authenticated"}',true);
 SELECT count(*) INTO n FROM public.ai_systems;
 IF n<>0 THEN RAISE EXCEPTION 'Unknown identity exposed AI';END IF;checks:=checks+1;
 SELECT count(*) INTO n FROM public.documents;
 IF n<>0 THEN RAISE EXCEPTION 'Unknown identity exposed documents';END IF;checks:=checks+1;
 -- Direct table writes are intentionally denied by SQL GRANT; protected server APIs own writes.
 IF has_table_privilege('authenticated','public.ai_systems','INSERT') THEN RAISE EXCEPTION 'Unexpected direct AI INSERT GRANT';END IF;checks:=checks+1;
 IF has_table_privilege('authenticated','public.ai_systems','UPDATE') THEN RAISE EXCEPTION 'Unexpected direct AI UPDATE GRANT';END IF;checks:=checks+1;
 IF has_table_privilege('authenticated','public.ai_systems','DELETE') THEN RAISE EXCEPTION 'Unexpected direct AI DELETE GRANT';END IF;checks:=checks+1;
 IF has_table_privilege('authenticated','public.documents','INSERT') THEN RAISE EXCEPTION 'Unexpected direct docs INSERT GRANT';END IF;checks:=checks+1;
 IF has_table_privilege('authenticated','public.documents','UPDATE') THEN RAISE EXCEPTION 'Unexpected direct docs UPDATE GRANT';END IF;checks:=checks+1;
 IF has_table_privilege('authenticated','public.documents','DELETE') THEN RAISE EXCEPTION 'Unexpected direct docs DELETE GRANT';END IF;checks:=checks+1;
 IF checks<>20 THEN RAISE EXCEPTION 'VE1 expected 20 assertions, got %',checks;END IF;
 RAISE NOTICE 'VE1 isolated SQL RLS + direct write ACL checks 20/20';
END $qa_rls$;
RESET ROLE;
ROLLBACK;
SELECT json_build_object('test','VE1_QA_TRANSIENT_RESOURCE_RLS',
 'assertions_passed',20,
 'failed',0,
 'ai_after_rollback',(SELECT count(*) FROM public.ai_systems),
 'documents_after_rollback',(SELECT count(*) FROM public.documents),
 'contract_sources_after_rollback',(SELECT count(*) FROM public.enterprise_entitlement_sources),
 'contract_snapshots_after_rollback',(SELECT count(*) FROM public.enterprise_entitlement_snapshots),
 'signed_JWT','NOT_VERIFIED','real_commercial_authority','NOT_VERIFIED',
 'formal_acceptance','NOT_ACCEPTED') AS proof;
