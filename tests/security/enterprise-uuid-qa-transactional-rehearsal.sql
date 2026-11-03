-- Isolated QA ONLY. Run after the matching forward migration BODY inside
-- a single controlled BEGIN/ROLLBACK. This script updates one pre-existing
-- synthetic QA membership transiently and returns it to original state via
-- ROLLBACK. It does not insert an Auth user, send emails or deploy.
-- Fails closed if the synthetic fixture inventory has changed.
DO $preflight$
BEGIN
 IF (SELECT count(*) FROM public.organizations) <> 2
    OR (SELECT count(*) FROM public.organization_members) <> 5
    OR (SELECT count(*) FROM public.organization_members
        WHERE lower(coalesce(status,''))='active' AND clerk_user_id LIKE 'qa-%') <> 5
    OR (SELECT count(*) FROM public.organization_members WHERE user_id IS NOT NULL) <> 0
    OR (SELECT count(*) FROM auth.users) <> 5 THEN
   RAISE EXCEPTION 'Refusing UUID QA test: expected synthetic fixtures not present';
 END IF;
END $preflight$;

CREATE TEMP TABLE qa_uuid_rehearsal_20261103 ON COMMIT DROP AS
 SELECT m.id AS member_id, m.organization_id AS org_a,
   (SELECT o.id FROM public.organizations AS o
    WHERE o.id <> m.organization_id ORDER BY o.id LIMIT 1) AS org_b,
   (SELECT u.id FROM auth.users AS u ORDER BY u.id LIMIT 1) AS valid_uuid
 FROM public.organization_members AS m
 WHERE lower(m.status)='active' AND lower(m.role)='owner'
   AND m.clerk_user_id LIKE 'qa-%' AND m.user_id IS NULL
 ORDER BY m.organization_id,m.id LIMIT 1;
GRANT SELECT ON TABLE pg_temp.qa_uuid_rehearsal_20261103 TO authenticated;

DO $attach$
DECLARE changed int;
BEGIN
 IF (SELECT count(*) FROM pg_temp.qa_uuid_rehearsal_20261103) <> 1
    OR (SELECT count(*) FROM pg_temp.qa_uuid_rehearsal_20261103
        WHERE org_a IS NOT NULL AND org_b IS NOT NULL
          AND org_a <> org_b AND valid_uuid IS NOT NULL) <> 1 THEN
   RAISE EXCEPTION 'Refusing UUID QA test: invalid tenant or Auth fixture';
 END IF;
 UPDATE public.organization_members AS m SET user_id=f.valid_uuid
 FROM pg_temp.qa_uuid_rehearsal_20261103 f
 WHERE m.id=f.member_id AND m.user_id IS NULL;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'Expected one transient UUID link'; END IF;
END $attach$;

SET LOCAL ROLE authenticated;
DO $uuid_positive_negative$
DECLARE f record; assurance text;
 own_read bool; own_manage bool; cross_read bool; cross_manage bool;
 verified int := 0;
BEGIN
 SELECT * INTO STRICT f FROM pg_temp.qa_uuid_rehearsal_20261103;
 FOREACH assurance IN ARRAY ARRAY['aal1','aal2'] LOOP
  PERFORM set_config('request.jwt.claim.sub',f.valid_uuid::text,true);
  PERFORM set_config('request.jwt.claims',
   jsonb_build_object('sub',f.valid_uuid::text,'aal',assurance)::text,true);
  SELECT app_private.enterprise_member_can_read(f.org_a),
         app_private.enterprise_member_can_manage(f.org_a),
         app_private.enterprise_member_can_read(f.org_b),
         app_private.enterprise_member_can_manage(f.org_b)
  INTO own_read,own_manage,cross_read,cross_manage;
  IF own_read IS DISTINCT FROM (assurance='aal2')
    OR own_manage IS DISTINCT FROM (assurance='aal2')
    OR cross_read IS DISTINCT FROM false
    OR cross_manage IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'UUID owner tenant/MFA failed: %',assurance;
  END IF;
  verified:=verified+4;
 END LOOP;
 -- Unknown but well-formed UUID may not access either tenant (4 assertions).
 PERFORM set_config('request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000000',true);
 PERFORM set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000000","aal":"aal2"}',true);
 SELECT app_private.enterprise_member_can_read(f.org_a),
        app_private.enterprise_member_can_manage(f.org_a),
        app_private.enterprise_member_can_read(f.org_b),
        app_private.enterprise_member_can_manage(f.org_b)
 INTO own_read,own_manage,cross_read,cross_manage;
 IF own_read IS DISTINCT FROM false OR own_manage IS DISTINCT FROM false
    OR cross_read IS DISTINCT FROM false OR cross_manage IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'Unknown UUID incorrectly obtained tenant authority';
 END IF;
 verified:=verified+4;
 IF verified<>12 THEN RAISE EXCEPTION 'UUID first section incomplete'; END IF;
END $uuid_positive_negative$;
RESET ROLE;

-- Deprovisioned actor must lose access within the SAME transaction.
DO $suspend$
DECLARE changed int;
BEGIN
 UPDATE public.organization_members AS m SET status='suspended'
 FROM pg_temp.qa_uuid_rehearsal_20261103 f
 WHERE m.id=f.member_id AND lower(m.status)='active';
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'Expected one transient suspend'; END IF;
END $suspend$;

SET LOCAL ROLE authenticated;
DO $uuid_deprovision_denial$
DECLARE f record; own_read bool; own_manage bool; cross_read bool; cross_manage bool;
BEGIN
 SELECT * INTO STRICT f FROM pg_temp.qa_uuid_rehearsal_20261103;
 PERFORM set_config('request.jwt.claim.sub',f.valid_uuid::text,true);
 PERFORM set_config('request.jwt.claims',
   jsonb_build_object('sub',f.valid_uuid::text,'aal','aal2')::text,true);
 SELECT app_private.enterprise_member_can_read(f.org_a),
        app_private.enterprise_member_can_manage(f.org_a),
        app_private.enterprise_member_can_read(f.org_b),
        app_private.enterprise_member_can_manage(f.org_b)
 INTO own_read,own_manage,cross_read,cross_manage;
 IF own_read IS DISTINCT FROM false OR own_manage IS DISTINCT FROM false
   OR cross_read IS DISTINCT FROM false OR cross_manage IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'Suspended UUID still had Enterprise permissions';
 END IF;
END $uuid_deprovision_denial$;
RESET ROLE;
SELECT '16/16' AS verified_uuid_cases;
