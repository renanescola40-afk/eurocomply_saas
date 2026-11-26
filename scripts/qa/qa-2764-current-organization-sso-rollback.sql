-- #2764 separate QA current-organization capability rollback candidate.
-- Independently reviewed exact executable only. Bind the ORIGINAL installed
-- fingerprint externally using the single sentinel before execution.
-- Never substitute a fingerprint computed from the object at rollback time.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='20s';
DO $rollback$
DECLARE expected text:='REPLACE_WITH_ORIGINAL_INSTALL_PROVENANCE'; actual text;
 fn oid:=to_regprocedure('public.get_my_qa_organization_context()');
BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')::int/10000<>17
 OR (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
 OR expected !~ '^[0-9a-f]{64}$' OR fn IS NULL
 OR to_regprocedure('public.get_my_mfa_bootstrap_context()') IS NULL
 OR to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NULL
 THEN RAISE EXCEPTION 'qa_org_context_rollback_preflight_refused'; END IF;
 SELECT encode(sha256(convert_to((jsonb_build_object('oid',p.oid::text,'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',coalesce((SELECT jsonb_agg(jsonb_build_array(a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable) ORDER BY a.grantor,a.grantee,a.privilege_type,a.is_grantable) FROM aclexplode(p.proacl) a),'[]'::jsonb),'comment',obj_description(p.oid,'pg_proc')))::text,'UTF8')),'hex') INTO STRICT actual FROM pg_proc p WHERE p.oid=fn;
 IF actual IS DISTINCT FROM expected
 OR NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=fn AND pg_get_userbyid(p.proowner)='postgres' AND p.prosecdef AND p.proconfig=ARRAY['search_path=""'])
 OR has_function_privilege('anon',fn,'EXECUTE') OR has_function_privilege('service_role',fn,'EXECUTE')
 OR NOT has_function_privilege('authenticated',fn,'EXECUTE')
 THEN RAISE EXCEPTION 'qa_org_context_rollback_provenance_refused'; END IF;
END $rollback$;
DROP FUNCTION public.get_my_qa_organization_context() RESTRICT;
DO $post$
BEGIN
 IF to_regprocedure('public.get_my_qa_organization_context()') IS NOT NULL
 OR to_regprocedure('public.get_my_mfa_bootstrap_context()') IS NULL
 OR to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NULL
 THEN RAISE EXCEPTION 'qa_org_context_rollback_postcondition_refused'; END IF;
END $post$;
COMMIT;
