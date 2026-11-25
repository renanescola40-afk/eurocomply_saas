-- #2764 V2 REVIEW CANDIDATE ONLY. Paired with install blob c9f4fcb54034465c7fa4cc95f02d0fc2d9d531ca.
-- QA zrxrrfbllsxtleyxjpsz only, exclusive governed DDL window.
-- Before execution, a trusted operator substitutes ONLY the two sentinel strings
-- with the externally retained, independently checked successful-install manifest
-- SHA256 values (recorded for this exact QA installation, not recomputed now).
-- Without both values this file intentionally fails closed. Do not drop a changed,
-- replaced, differently owned, regranted, absent or unrelated object.
BEGIN;
SET LOCAL search_path = pg_catalog;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';
DO $rollback$
DECLARE f record; fn oid; actual text;
BEGIN
 IF current_user <> 'postgres' OR current_setting('server_version_num')::int/10000<>17
 OR (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('20261120134634','20261120134701'))<>2
 OR (SELECT count(*) FROM public.organizations)<>2
 THEN RAISE EXCEPTION 'qa_rollback_environment_refused'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('qa_create_ai_system_for_session','qa_reassess_ai_system_for_session'))
 THEN RAISE EXCEPTION 'qa_rollback_exposed_bridge_refused'; END IF;
 -- Check BOTH objects before either DROP; no partial rollback.
 FOR f IN SELECT * FROM (VALUES
 ('public.get_my_mfa_bootstrap_context()','__REVIEWED_BOOTSTRAP_PROVENANCE_SHA256__',true),
 ('app_private.qa_require_ai_inventory_actor(uuid)','__REVIEWED_GUARD_PROVENANCE_SHA256__',false)
 ) AS expected(signature,fingerprint,is_bootstrap) LOOP
  IF f.fingerprint !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'qa_rollback_missing_install_manifest'; END IF;
  fn:=to_regprocedure(f.signature);
  IF fn IS NULL OR NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=fn AND p.prosecdef AND pg_get_userbyid(p.proowner)='postgres' AND p.proconfig=ARRAY['search_path=""'])
  OR has_function_privilege('anon',fn,'EXECUTE')
  OR has_function_privilege('service_role',fn,'EXECUTE')
  OR has_function_privilege('authenticated',fn,'EXECUTE') IS DISTINCT FROM f.is_bootstrap
  THEN RAISE EXCEPTION 'qa_rollback_owner_or_effective_acl_refused: %',f.signature; END IF;
  SELECT encode(sha256(convert_to((jsonb_build_object('oid',p.oid::text,'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',coalesce((SELECT jsonb_agg(jsonb_build_array(x.grantor::text,x.grantee::text,x.privilege_type,x.is_grantable) ORDER BY x.grantor,x.grantee,x.privilege_type,x.is_grantable) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),'[]'::jsonb),'comment',obj_description(p.oid,'pg_proc')))::text,'UTF8')),'hex') INTO STRICT actual FROM pg_proc p WHERE p.oid=fn;
  IF actual IS DISTINCT FROM f.fingerprint THEN RAISE EXCEPTION 'qa_rollback_provenance_mismatch: %',f.signature; END IF;
 END LOOP;
END $rollback$;
DROP FUNCTION app_private.qa_require_ai_inventory_actor(uuid) RESTRICT;
DROP FUNCTION public.get_my_mfa_bootstrap_context() RESTRICT;
DO $postconditions$
BEGIN
 IF to_regprocedure('public.get_my_mfa_bootstrap_context()') IS NOT NULL OR to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NOT NULL
 OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'qa_rollback_postcondition_refused'; END IF;
END $postconditions$;
COMMIT;
