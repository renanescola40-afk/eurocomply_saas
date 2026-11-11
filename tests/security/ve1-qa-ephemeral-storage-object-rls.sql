-- RISCK VE1 A-03: Storage.objects SQL metadata RLS (NOT Storage binary/upload/download API).
-- QA-only, entirely transactional temporary objects and synthetic contract-source fixtures.
-- Do not execute on PROD. No real contract, payment, file bytes, JWT or accepted security gate.
BEGIN;
DO $seed$
DECLARE o record; src uuid; i integer:=0;
BEGIN
 IF (SELECT count(*) FROM public.organizations)<>2
 OR (SELECT count(*) FROM storage.objects)<>0
 OR (SELECT count(*) FROM public.enterprise_entitlement_sources)<>0
 OR (SELECT count(*) FROM public.enterprise_entitlement_snapshots)<>0
 OR (SELECT count(*) FROM public.organizations WHERE app_private.has_commercial_authority(id))<>0
 OR (SELECT count(*) FROM storage.buckets WHERE id IN ('compliance-documents','controlled-documents') AND public=false)<>2
 OR (SELECT count(DISTINCT organization_id) FROM public.organization_members
    WHERE role='owner' AND lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL)<>2
 THEN RAISE EXCEPTION 'QA-only preflight absent or unexpectedly populated';END IF;
 FOR o IN SELECT id FROM public.organizations ORDER BY id LOOP
  INSERT INTO public.enterprise_entitlement_sources
   (organization_id,source_kind,external_reference,priority,active,version,effective_from)
  VALUES(o.id,'signed_contract','QA_SYNTHETIC_EPHEMERAL_NOT_REAL_SIGNED_CONTRACT',999,true,1,now()-interval '1 hour')
  RETURNING id INTO src;
  INSERT INTO public.enterprise_entitlement_snapshots
   (organization_id,source_id,idempotency_key,source_version,plan_code,
    full_seat_limit,participant_seat_limit,viewer_seat_limit,entitlements,
    source_payload_sha256,observed_at,valid_from,status)
  VALUES(o.id,src,'ve1_storage_rollback_only_'||i,1,'professional',
    50,20,20,'{"synthetic":true,"not_a_real_contract":true}'::jsonb,
    'a70b25758636717ca4587d3150f3a59fc59a88beb3533d909d752be52dc23000',
    now(),now()-interval '1 hour','applied');
  IF app_private.has_commercial_authority(o.id) IS DISTINCT FROM TRUE
  THEN RAISE EXCEPTION 'Temporary QA authority absent';END IF;
  INSERT INTO storage.objects(bucket_id,name,metadata)
  VALUES('compliance-documents',o.id::text||'/ve1-transient-metadata-only-'||i||'.txt','{"mimetype":"text/plain","size":0,"qa_synthetic":true}'::jsonb);
  INSERT INTO storage.objects(bucket_id,name,metadata)
  VALUES('controlled-documents',o.id::text||'/ve1-transient-controlled-only-'||i||'.txt','{"mimetype":"text/plain","size":0,"qa_synthetic":true}'::jsonb);
  i:=i+1;
 END LOOP;
 IF i<>2 OR (SELECT count(*) FROM storage.objects)<>4 THEN
  RAISE EXCEPTION 'Expected four transient Storage metadata rows';END IF;
END $seed$;
DO $identity$
DECLARE a uuid;b uuid;sa text;sb text;
BEGIN
 SELECT organization_id,clerk_user_id INTO a,sa FROM public.organization_members
 WHERE role='owner' AND lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL
 ORDER BY organization_id,clerk_user_id LIMIT 1;
 SELECT organization_id,clerk_user_id INTO b,sb FROM public.organization_members
 WHERE role='owner' AND lower(coalesce(status,''))='active' AND clerk_user_id IS NOT NULL
 AND organization_id<>a ORDER BY organization_id,clerk_user_id LIMIT 1;
 IF a IS NULL OR b IS NULL OR sa IS NULL OR sb IS NULL THEN RAISE EXCEPTION 'Owner fixture unavailable';END IF;
 IF (SELECT count(*) FROM public.organization_security_settings
 WHERE organization_id IN (a,b) AND require_mfa_for_all_users)<>2 THEN
 RAISE EXCEPTION 'QA test must have MFA required for both organizations';END IF;
 PERFORM set_config('ve1.a',a::text,true);PERFORM set_config('ve1.b',b::text,true);
 PERFORM set_config('ve1.sa',sa,true);PERFORM set_config('ve1.sb',sb,true);
END $identity$;
SET LOCAL ROLE authenticated;
DO $checks$
DECLARE i int;own_org uuid;other_org uuid;subject text;n int;k int:=0;
BEGIN
 IF current_user<>'authenticated' THEN RAISE EXCEPTION 'Not authenticated SQL role';END IF;
 FOR i IN 1..2 LOOP
  IF i=1 THEN own_org:=current_setting('ve1.a')::uuid;other_org:=current_setting('ve1.b')::uuid;subject:=current_setting('ve1.sa');
  ELSE own_org:=current_setting('ve1.b')::uuid;other_org:=current_setting('ve1.a')::uuid;subject:=current_setting('ve1.sb');END IF;
  PERFORM set_config('request.jwt.claim.sub',subject,true);
  PERFORM set_config('request.jwt.claims',json_build_object('sub',subject,'aal','aal2','role','authenticated')::text,true);
  SELECT count(*) INTO n FROM storage.objects
  WHERE bucket_id='compliance-documents' AND name LIKE own_org::text||'/%';
  IF n<>1 THEN RAISE EXCEPTION 'AAL2 own object metadata unavailable % count=%',i,n;END IF;k:=k+1;
  SELECT count(*) INTO n FROM storage.objects
  WHERE bucket_id='compliance-documents' AND name LIKE other_org::text||'/%';
  IF n<>0 THEN RAISE EXCEPTION 'AAL2 other-tenant object metadata exposed %',i;END IF;k:=k+1;
  SELECT count(*) INTO n FROM storage.objects
  WHERE bucket_id='controlled-documents' AND name LIKE own_org::text||'/%';
  IF n<>0 THEN RAISE EXCEPTION 'Controlled object metadata exposed %',i;END IF;k:=k+1;
  SELECT count(*) INTO n FROM storage.objects
  WHERE bucket_id='controlled-documents' AND name LIKE other_org::text||'/%';
  IF n<>0 THEN RAISE EXCEPTION 'Controlled other-tenant object metadata exposed %',i;END IF;k:=k+1;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',subject,'aal','aal1','role','authenticated')::text,true);
  SELECT count(*) INTO n FROM storage.objects
  WHERE bucket_id='compliance-documents' AND name LIKE own_org::text||'/%';
  IF n<>0 THEN RAISE EXCEPTION 'AAL1 own Storage metadata exposed %',i;END IF;k:=k+1;
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub','user_ve1_unknown_storage',true);
 PERFORM set_config('request.jwt.claims','{"sub":"user_ve1_unknown_storage","aal":"aal2","role":"authenticated"}',true);
 SELECT count(*) INTO n FROM storage.objects WHERE bucket_id='compliance-documents';
 IF n<>0 THEN RAISE EXCEPTION 'Unknown subject accessed document Storage';END IF;k:=k+1;
 IF k<>11 THEN RAISE EXCEPTION 'Expected 11 Storage role assertions, got %',k;END IF;
END $checks$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $anonymous$
DECLARE n int;
BEGIN
 IF current_user<>'anon' THEN RAISE EXCEPTION 'Anon role not selected';END IF;
 SELECT count(*) INTO n FROM storage.objects;
 IF n<>0 THEN RAISE EXCEPTION 'Anonymous Storage metadata leak count=%',n;END IF;
END $anonymous$;
RESET ROLE;
ROLLBACK;
SELECT json_build_object('suite','VE1_QA_EPHEMERAL_STORAGE_METADATA_RLS',
  'assertions_passed',12,'objects_after',(SELECT count(*) FROM storage.objects),
  'commercial_sources_after',(SELECT count(*) FROM public.enterprise_entitlement_sources),
  'commercial_snapshots_after',(SELECT count(*) FROM public.enterprise_entitlement_snapshots),
  'storage_binary_api','NOT_TESTED','signed_jwt','NOT_TESTED',
  'formal_acceptance','NOT_ACCEPTED') AS result;