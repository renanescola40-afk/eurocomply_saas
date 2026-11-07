-- RISCK COMPLY / A-03 SEC-03 / Storage INSERT policy QA proof.
-- Existing synthetic Supabase QA ONLY zrxrrfbllsxtleyxjpsz. Never PROD.
-- No real file bytes, uploads, external side effects or permanent QA state.
BEGIN;
SET LOCAL statement_timeout='12000ms';
SET LOCAL lock_timeout='1200ms';
DO $fixture$
DECLARE
 own_org uuid; foreign_org uuid; owner_sub text; source_id uuid; target_org uuid;
BEGIN
 IF (SELECT count(*) FROM public.organizations)<>2
   OR (SELECT count(*) FROM public.organization_members
       WHERE clerk_user_id LIKE 'qa-%' AND user_id IS NULL AND status='active')<>5
   OR (SELECT count(*) FROM public.organization_security_settings
       WHERE require_mfa_for_all_users)<>2
   OR (SELECT count(*) FROM public.enterprise_entitlement_sources WHERE active)<>0
   OR (SELECT count(*) FROM public.enterprise_entitlement_snapshots WHERE status='applied')<>0
   OR (SELECT count(*) FROM storage.objects)<>0
   OR NOT EXISTS (SELECT 1 FROM storage.buckets
                  WHERE id='compliance-documents' AND public=false)
   OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='storage.objects'::regclass
                  AND relrowsecurity)
   OR EXISTS (SELECT 1 FROM pg_trigger
              WHERE tgrelid='storage.objects'::regclass AND NOT tgisinternal
                AND (tgtype::integer & 4)=4)
 THEN RAISE EXCEPTION 'SEC03_STORAGE_WRITE_QA_PREFLIGHT_REFUSED'; END IF;
 SELECT organization_id,clerk_user_id INTO own_org,owner_sub
 FROM public.organization_members WHERE role='owner' AND status='active'
   AND clerk_user_id LIKE 'qa-%' ORDER BY organization_id LIMIT 1;
 SELECT id INTO foreign_org FROM public.organizations WHERE id<>own_org LIMIT 1;
 IF own_org IS NULL OR foreign_org IS NULL OR owner_sub IS NULL
 THEN RAISE EXCEPTION 'SEC03_STORAGE_WRITE_QA_FIXTURE_MISSING'; END IF;
 PERFORM set_config('qa.sec03_write.own',own_org::text,true);
 PERFORM set_config('qa.sec03_write.foreign',foreign_org::text,true);
 PERFORM set_config('qa.sec03_write.owner',owner_sub,true);
 FOR target_org IN SELECT unnest(ARRAY[own_org,foreign_org]) LOOP
   INSERT INTO public.enterprise_entitlement_sources
     (organization_id,source_kind,external_reference,priority,active,version,effective_from)
   VALUES(target_org,'signed_contract','qa-sec03-write-rollback-only',900,true,1,
     now()-interval '3 minutes') RETURNING id INTO source_id;
   INSERT INTO public.enterprise_entitlement_snapshots
     (organization_id,source_id,idempotency_key,source_version,plan_code,
      full_seat_limit,participant_seat_limit,viewer_seat_limit,entitlements,
      source_payload_sha256,observed_at,valid_from,status,applied_policy_version)
   VALUES(target_org,source_id,'qa-sec03-write-rollback-v1',1,'business',
     1,1,1,'{"purpose":"qa-storage-insert-rollback"}'::jsonb,repeat('a',64),
     now()-interval '1 minute',now()-interval '3 minutes','applied',1);
 END LOOP;
END $fixture$;

SET LOCAL ROLE authenticated;
DO $rls_write$
DECLARE own_org uuid:=current_setting('qa.sec03_write.own')::uuid;
 foreign_org uuid:=current_setting('qa.sec03_write.foreign')::uuid;
 owner_sub text:=current_setting('qa.sec03_write.owner');
 blocked boolean; affected_rows bigint;
BEGIN
 IF current_setting('role',true)<>'authenticated'
 THEN RAISE EXCEPTION 'SEC03_STORAGE_WRITE_ROLE_MISMATCH'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_sub,true);
 PERFORM set_config('request.jwt.claims',
   jsonb_build_object('sub',owner_sub,'role','authenticated','aal','aal2')::text,true);
 -- Positive control: real policy authorizes own-tenant metadata insertion.
 INSERT INTO storage.objects(bucket_id,name)
 VALUES('compliance-documents',own_org::text||'/qa-sec03-write-own.txt');
 IF NOT EXISTS (SELECT 1 FROM storage.objects
                WHERE name=own_org::text||'/qa-sec03-write-own.txt')
 THEN RAISE EXCEPTION 'SEC03_STORAGE_WRITE_OWN_POSITIVE_FAILED'; END IF;
 -- UPDATE must also be denied: no UPDATE policy exists for compliance-documents.
 -- The positive INSERT row makes this non-vacuous (an actual own row exists).
 blocked:=false;
 BEGIN
   UPDATE storage.objects SET metadata='{"qa":"unauthorized-update"}'::jsonb
   WHERE bucket_id='compliance-documents'
     AND name=own_org::text||'/qa-sec03-write-own.txt';
   GET DIAGNOSTICS affected_rows = ROW_COUNT;
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; affected_rows:=0;
 END;
 IF affected_rows <> 0 OR (NOT blocked AND EXISTS (
   SELECT 1 FROM storage.objects
   WHERE bucket_id='compliance-documents'
     AND name=own_org::text||'/qa-sec03-write-own.txt'
     AND metadata='{"qa":"unauthorized-update"}'::jsonb))
 THEN RAISE EXCEPTION 'SEC03_STORAGE_WRITE_UNAUTHORIZED_UPDATE_BYPASS'; END IF;
 -- DELETE must not remove the existing own-tenant object. The storage.objects
 -- protect_delete statement trigger may reject the attempt independently of RLS.
 -- Both SQLSTATE 42501 and a zero-row DELETE are legitimate denials.
 blocked:=false;
 BEGIN
   DELETE FROM storage.objects
   WHERE bucket_id='compliance-documents'
     AND name=own_org::text||'/qa-sec03-write-own.txt';
   GET DIAGNOSTICS affected_rows = ROW_COUNT;
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; affected_rows:=0;
 END;
 IF affected_rows <> 0 OR NOT EXISTS (
   SELECT 1 FROM storage.objects
   WHERE bucket_id='compliance-documents'
     AND name=own_org::text||'/qa-sec03-write-own.txt'
 )
 THEN RAISE EXCEPTION 'SEC03_STORAGE_WRITE_UNAUTHORIZED_DELETE_BYPASS'; END IF;
 -- Same AAL2 owner cannot write in a separately entitled foreign tenant.
 blocked:=false;
 BEGIN
   INSERT INTO storage.objects(bucket_id,name)
   VALUES('compliance-documents',foreign_org::text||'/qa-sec03-write-foreign.txt');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF blocked IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'SEC03_STORAGE_WRITE_FOREIGN_TENANT_BYPASS'; END IF;

 PERFORM set_config('request.jwt.claims',
   jsonb_build_object('sub',owner_sub,'role','authenticated','aal','aal1')::text,true);
 blocked:=false;
 BEGIN
   INSERT INTO storage.objects(bucket_id,name)
   VALUES('compliance-documents',own_org::text||'/qa-sec03-write-aal1.txt');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF blocked IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'SEC03_STORAGE_WRITE_AAL1_BYPASS'; END IF;

 PERFORM set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true);
 PERFORM set_config('request.jwt.claims',
   '{"sub":"00000000-0000-4000-8000-000000000000","role":"authenticated","aal":"aal2"}',true);
 blocked:=false;
 BEGIN
   INSERT INTO storage.objects(bucket_id,name)
   VALUES('compliance-documents',own_org::text||'/qa-sec03-write-outsider.txt');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF blocked IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'SEC03_STORAGE_WRITE_OUTSIDER_BYPASS'; END IF;
END $rls_write$;
RESET ROLE;
ROLLBACK;
SELECT 'QA_SEC03_STORAGE_TENANT_INSERT_AAL2_ROLLBACK_PASS'::text AS result;
