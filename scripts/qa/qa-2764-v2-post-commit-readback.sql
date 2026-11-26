-- Independent post-COMMIT readback. NOT an install or rollback.
-- QA zrxrrfbllsxtleyxjpsz only; install source c9f4fcb54034465c7fa4cc95f02d0fc2d9d531ca.
-- Compare returned fingerprints to the retained install-time manifest.
-- Never use this query to create missing rollback provenance.
BEGIN READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL statement_timeout='8s';
DO $baseline$
BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')::int/10000<>17
 OR (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('20261120134634','20261120134701'))<>2
 THEN RAISE EXCEPTION 'qa_post_install_wrong_environment'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('qa_create_ai_system_for_session','qa_reassess_ai_system_for_session'))
 OR (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE (n.nspname='public' AND p.proname='get_my_mfa_bootstrap_context') OR (n.nspname='app_private' AND p.proname='qa_require_ai_inventory_actor'))<>2
 THEN RAISE EXCEPTION 'qa_post_install_unexpected_capability'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_mfa_bootstrap_context()')
 AND encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')='626cbb0245408ff3ca0bc5def933ceb4d29db67309fa997fd951b35971b8057a'
 AND p.provolatile='s' AND p.proretset AND pg_get_function_result(p.oid)='TABLE(organization_id uuid, require_mfa_for_all_users boolean)')
 OR NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)')
 AND encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')='3ca81dac22f62ff3bf4095948ff5975184521e54dac5eb36fc1eb936bbcda8ed'
 AND p.provolatile='v' AND NOT p.proretset AND pg_get_function_result(p.oid)='uuid')
 THEN RAISE EXCEPTION 'qa_post_install_body_or_signature_drift'; END IF;
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity AND c.relforcerowsecurity)<>115
 OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='storage' AND c.relkind IN ('r','p') AND c.relrowsecurity)<>10
 OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','app_private.resolve_commercial_plan(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'qa_post_install_legacy_security_drift'; END IF;
END $baseline$;
DO $postconditions$
DECLARE f record; fn oid; expected_count int; owner_oid oid; auth_oid oid;
BEGIN
 SELECT oid INTO STRICT owner_oid FROM pg_roles WHERE rolname='postgres';
 SELECT oid INTO STRICT auth_oid FROM pg_roles WHERE rolname='authenticated';
 FOR f IN SELECT * FROM (VALUES ('public.get_my_mfa_bootstrap_context()',true),('app_private.qa_require_ai_inventory_actor(uuid)',false)) AS x(signature,is_bootstrap) LOOP
  fn:=to_regprocedure(f.signature); expected_count:=CASE WHEN f.is_bootstrap THEN 2 ELSE 1 END;
  IF fn IS NULL OR NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=fn AND p.proowner=owner_oid AND p.prosecdef AND p.proconfig=ARRAY['search_path=""'])
  OR has_function_privilege('anon',fn,'EXECUTE')
  OR has_function_privilege('service_role',fn,'EXECUTE')
  OR has_function_privilege('authenticated',fn,'EXECUTE') IS DISTINCT FROM f.is_bootstrap
  OR (SELECT count(*) FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE p.oid=fn)<>expected_count
  OR EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE p.oid=fn AND (x.grantor<>owner_oid OR x.privilege_type<>'EXECUTE' OR (x.grantee<>owner_oid AND NOT(f.is_bootstrap AND x.grantee=auth_oid AND NOT x.is_grantable))))
  THEN RAISE EXCEPTION 'qa_install_postcondition_refused: %',f.signature; END IF;
 END LOOP;
END $postconditions$;


SELECT p.oid::regprocedure::text AS function_signature,
 encode(sha256(convert_to((jsonb_build_object('oid',p.oid::text,'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',coalesce((SELECT jsonb_agg(jsonb_build_array(x.grantor::text,x.grantee::text,x.privilege_type,x.is_grantable) ORDER BY x.grantor,x.grantee,x.privilege_type,x.is_grantable) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),'[]'::jsonb),'comment',obj_description(p.oid,'pg_proc')))::text,'UTF8')),'hex') AS provenance_sha256
FROM pg_proc p WHERE p.oid IN (to_regprocedure('public.get_my_mfa_bootstrap_context()'),to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)'))
ORDER BY 1;

ROLLBACK;
