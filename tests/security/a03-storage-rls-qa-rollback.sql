-- RISCK COMPLY / A-03 SEC-03 / Storage metadata RLS QA proof.
-- Isolated synthetic Supabase QA zrxrrfbllsxtleyxjpsz ONLY; NEVER PROD.
-- No real file bytes, no Storage API request, no external side-effects.
-- All synthetic entitlement and storage metadata rows ROLLBACK.
BEGIN;
SET LOCAL statement_timeout = '12000ms';
SET LOCAL lock_timeout = '1200ms';
DO $qa_fixture$
DECLARE
  v_own uuid; v_foreign uuid; v_owner_sub text; v_foreign_owner_sub text;
  v_tenant uuid; v_source_id uuid;
BEGIN
  IF (SELECT count(*) FROM public.organizations) <> 2
    OR (SELECT count(*) FROM auth.users) <> 5
    OR (SELECT count(*) FROM public.organization_members
         WHERE clerk_user_id LIKE 'qa-%' AND user_id IS NULL AND status='active') <> 5
    OR (SELECT count(*) FROM public.organization_security_settings
         WHERE require_mfa_for_all_users) <> 2
    OR (SELECT count(*) FROM public.enterprise_entitlement_sources WHERE active) <> 0
    OR (SELECT count(*) FROM public.enterprise_entitlement_snapshots WHERE status='applied') <> 0
    OR (SELECT count(*) FROM storage.objects) <> 0
    OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='compliance-documents' AND public=false)
    OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='storage.objects'::regclass AND relrowsecurity)
    OR EXISTS (SELECT 1 FROM pg_trigger
               WHERE tgrelid='storage.objects'::regclass
                 AND NOT tgisinternal AND (tgtype::integer & 4)=4)
  THEN RAISE EXCEPTION 'SEC03_STORAGE_QA_FIXTURE_OR_SIDE_EFFECT_GUARD_FAILED'; END IF;

  SELECT organization_id,clerk_user_id INTO v_own,v_owner_sub
  FROM public.organization_members
  WHERE clerk_user_id LIKE 'qa-%' AND role='owner' AND status='active'
  ORDER BY organization_id LIMIT 1;
  SELECT organization_id,clerk_user_id INTO v_foreign,v_foreign_owner_sub
  FROM public.organization_members
  WHERE organization_id<>v_own AND clerk_user_id LIKE 'qa-%'
    AND role='owner' AND status='active' LIMIT 1;
  IF v_own IS NULL OR v_foreign IS NULL OR v_owner_sub IS NULL
     OR v_foreign_owner_sub IS NULL OR v_own=v_foreign
  THEN RAISE EXCEPTION 'SEC03_STORAGE_QA_TENANTS_MISSING'; END IF;

  PERFORM set_config('qa.sec03_storage.own_org',v_own::text,true);
  PERFORM set_config('qa.sec03_storage.foreign_org',v_foreign::text,true);
  PERFORM set_config('qa.sec03_storage.owner_sub',v_owner_sub,true);
  PERFORM set_config('qa.sec03_storage.foreign_owner_sub',v_foreign_owner_sub,true);

  FOR v_tenant IN SELECT unnest(ARRAY[v_own,v_foreign]) LOOP
    INSERT INTO public.enterprise_entitlement_sources
      (organization_id,source_kind,external_reference,priority,active,version,effective_from)
    VALUES (v_tenant,'signed_contract','qa-rollback-only-storage-sec03',900,true,1,
      now()-interval '3 minutes') RETURNING id INTO v_source_id;
    INSERT INTO public.enterprise_entitlement_snapshots
      (organization_id,source_id,idempotency_key,source_version,plan_code,
       full_seat_limit,participant_seat_limit,viewer_seat_limit,entitlements,
       source_payload_sha256,observed_at,valid_from,status,applied_policy_version)
    VALUES (v_tenant,v_source_id,'qa-sec03-storage-rollback-v1',1,'business',
       1,1,1,'{"purpose":"qa-rollback-only-storage-rls"}'::jsonb,repeat('a',64),
       now()-interval '1 minute',now()-interval '3 minutes','applied',1);
  END LOOP;

  -- Rows are metadata-only, intentionally no actual blob object exists.
  INSERT INTO storage.objects(bucket_id,name)
    VALUES
      ('compliance-documents',v_own::text||'/qa-sec03-rollback-only.txt'),
      ('compliance-documents',v_foreign::text||'/qa-sec03-rollback-only.txt');
END $qa_fixture$;

SET LOCAL ROLE authenticated;
DO $qa_rls$
DECLARE
  v_own uuid:=current_setting('qa.sec03_storage.own_org')::uuid;
  v_foreign uuid:=current_setting('qa.sec03_storage.foreign_org')::uuid;
  v_owner_sub text:=current_setting('qa.sec03_storage.owner_sub');
  v_foreign_sub text:=current_setting('qa.sec03_storage.foreign_owner_sub');
BEGIN
  IF current_setting('role',true)<>'authenticated'
  THEN RAISE EXCEPTION 'SEC03_STORAGE_WRONG_DB_ROLE'; END IF;

  -- Positive and negative must be evaluated together against 2 actual rows.
  PERFORM set_config('request.jwt.claim.sub',v_owner_sub,true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_owner_sub,'role','authenticated','aal','aal2')::text,true);
  IF (SELECT count(*) FROM storage.objects
      WHERE bucket_id='compliance-documents'
        AND name IN (v_own::text||'/qa-sec03-rollback-only.txt',
                     v_foreign::text||'/qa-sec03-rollback-only.txt')) <> 1
    OR NOT EXISTS (SELECT 1 FROM storage.objects
                   WHERE name=v_own::text||'/qa-sec03-rollback-only.txt')
    OR EXISTS (SELECT 1 FROM storage.objects
               WHERE name=v_foreign::text||'/qa-sec03-rollback-only.txt')
  THEN RAISE EXCEPTION 'SEC03_STORAGE_TENANT_A_CROSS_READ_OR_OWN_DENIAL'; END IF;

  PERFORM set_config('request.jwt.claim.sub',v_foreign_sub,true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_foreign_sub,'role','authenticated','aal','aal2')::text,true);
  IF (SELECT count(*) FROM storage.objects
      WHERE bucket_id='compliance-documents'
        AND name LIKE '%/qa-sec03-rollback-only.txt') <> 1
    OR NOT EXISTS (SELECT 1 FROM storage.objects
                   WHERE name=v_foreign::text||'/qa-sec03-rollback-only.txt')
  THEN RAISE EXCEPTION 'SEC03_STORAGE_TENANT_B_OWN_READ_DENIED'; END IF;

  PERFORM set_config('request.jwt.claim.sub',v_owner_sub,true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_owner_sub,'role','authenticated','aal','aal1')::text,true);
  IF EXISTS (SELECT 1 FROM storage.objects
             WHERE bucket_id='compliance-documents'
               AND name LIKE '%/qa-sec03-rollback-only.txt')
  THEN RAISE EXCEPTION 'SEC03_STORAGE_AAL1_BYPASS'; END IF;

  PERFORM set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true);
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-4000-8000-000000000000","role":"authenticated","aal":"aal2"}',true);
  IF EXISTS (SELECT 1 FROM storage.objects
             WHERE bucket_id='compliance-documents'
               AND name LIKE '%/qa-sec03-rollback-only.txt')
  THEN RAISE EXCEPTION 'SEC03_STORAGE_OUTSIDER_READ_LEAK'; END IF;
END $qa_rls$;
RESET ROLE;
-- Anonymous clients must not read either tenant's private object metadata.
SET LOCAL ROLE anon;
DO $qa_anon_rls$
DECLARE denied boolean := false;
  exposed bigint := 0;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);
  PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
  BEGIN
    SELECT count(*) INTO exposed FROM storage.objects
    WHERE bucket_id='compliance-documents'
      AND name LIKE '%/qa-sec03-rollback-only.txt';
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied AND exposed <> 0
  THEN RAISE EXCEPTION 'SEC03_STORAGE_ANON_READ_LEAK'; END IF;
END $qa_anon_rls$;
RESET ROLE;
ROLLBACK;
SELECT 'QA_SEC03_STORAGE_TWO_TENANTS_AAL2_ROLLBACK_PASS'::text AS result;
