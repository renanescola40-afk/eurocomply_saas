-- #2764 exact candidate: QA-only rollback rehearsal; independent review required.
-- Original install blob 77e9325626361a9b1f2da4eae50a2d7268a10360.
-- Original rollback blob 2b47fee386c1ddc9983e6bf2d39bc7c50720cb70.
-- Single transaction: install, capture original fingerprint, exercise DROP RESTRICT,
-- verify absence/V2 preservation, then ROLLBACK. Never commit.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='20s';
DO $preflight$
BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')::int/10000<>17
 OR (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
 OR to_regprocedure('public.get_my_mfa_bootstrap_context()') IS NULL
 OR to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NULL
 OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='get_my_qa_organization_context')
 OR has_table_privilege('anon','public.enterprise_identity_connections','SELECT')
 OR has_table_privilege('authenticated','public.enterprise_identity_connections','SELECT')
 THEN RAISE EXCEPTION 'qa_org_context_preflight_refused'; END IF;
END $preflight$;

CREATE FUNCTION public.get_my_qa_organization_context()
RETURNS TABLE(organization_id uuid,role text,status text,name text,slug text,
 onboarding_status text,onboarding_completed_at timestamptz,selected_plan text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $context$
DECLARE actor uuid:=auth.uid(); claims jsonb:=auth.jwt(); sid uuid; provider text; rows_returned integer;
BEGIN
 IF actor IS NULL OR claims->>'sub' IS DISTINCT FROM actor::text
 OR claims->>'role' IS DISTINCT FROM 'authenticated'
 OR claims->>'aal' IS DISTINCT FROM 'aal2'
 OR claims->>'is_anonymous' IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'qa_org_context_denied' USING ERRCODE='42501'; END IF;
 BEGIN
   sid:=(claims->>'session_id')::uuid;
 EXCEPTION WHEN invalid_text_representation THEN
   RAISE EXCEPTION 'qa_org_context_denied' USING ERRCODE='42501';
 END;
 IF sid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.sessions s
   JOIN auth.mfa_factors f ON f.id=s.factor_id AND f.user_id=s.user_id
   WHERE s.id=sid AND s.user_id=actor AND s.aal::text='aal2'
   AND f.status::text='verified' AND (s.not_after IS NULL OR s.not_after>pg_catalog.now()))
 THEN RAISE EXCEPTION 'qa_org_context_denied' USING ERRCODE='42501'; END IF;
 -- Mirror extractTrustedSamlProviderId: the first valid signed SAML AMR
 -- entry, never user_metadata or a client-provided provider id.
 SELECT pg_catalog.lower(a.value->>'provider') INTO provider
 FROM pg_catalog.jsonb_array_elements(
   CASE WHEN pg_catalog.jsonb_typeof(claims->'amr')='array' THEN claims->'amr' ELSE '[]'::jsonb END
 ) WITH ORDINALITY AS a(value,ord)
 WHERE a.value->>'method'='sso/saml'
 AND a.value->>'provider' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 ORDER BY a.ord LIMIT 1;
 IF (SELECT count(*) FROM public.organization_members m WHERE m.user_id=actor AND m.status='active')>100
 OR EXISTS(SELECT 1 FROM public.organization_members m WHERE m.user_id=actor AND m.status='active'
 GROUP BY m.organization_id HAVING count(*)>1)
 THEN RAISE EXCEPTION 'qa_org_context_membership_unavailable'; END IF;
 RETURN QUERY SELECT m.organization_id,m.role::text,m.status::text,o.name::text,o.slug::text,
 o.onboarding_status::text,o.onboarding_completed_at,o.selected_plan::text
 FROM public.organization_members m
 JOIN public.organizations o ON o.id=m.organization_id
 JOIN public.organization_security_settings s ON s.organization_id=m.organization_id
 WHERE m.user_id=actor AND m.status='active' AND s.require_mfa_for_all_users IS NOT NULL
 AND pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(m.role),'^org:','','i'))=ANY(ARRAY[
 'owner','proprietario','proprietário','dono','admin','administrator','administrador','editor','manager','gestor',
 'compliance-manager','compliance_manager','compliance manager','member','membro','viewer','visualizador','read_only','readonly','leitor'])
 AND NOT EXISTS(SELECT 1 FROM public.enterprise_identity_connections p WHERE p.organization_id=m.organization_id
   AND p.enforce_sso=true AND p.status='active' AND p.protocol='saml' AND p.supabase_provider_id IS NULL)
 AND (NOT EXISTS(SELECT 1 FROM public.enterprise_identity_connections p WHERE p.organization_id=m.organization_id
   AND p.enforce_sso=true AND p.status='active' AND p.protocol='saml')
 OR EXISTS(SELECT 1 FROM public.enterprise_identity_connections p WHERE p.organization_id=m.organization_id
   AND p.enforce_sso=true AND p.status='active' AND p.protocol='saml' AND p.supabase_provider_id::text=provider))
 ORDER BY m.created_at,m.organization_id;
 GET DIAGNOSTICS rows_returned=ROW_COUNT;
 -- Don't turn denied memberships into an invitation to create a new tenant.
 IF rows_returned=0 AND EXISTS(SELECT 1 FROM public.organization_members m WHERE m.user_id=actor)
 THEN RAISE EXCEPTION 'qa_org_context_membership_denied' USING ERRCODE='42501'; END IF;
END $context$;
REVOKE ALL ON FUNCTION public.get_my_qa_organization_context() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_qa_organization_context() TO authenticated;
COMMENT ON FUNCTION public.get_my_qa_organization_context() IS 'QA-only #2764 signed live AAL2 own context, mandatory SAML enforced; not commercial authority';
DO $post$
DECLARE fn oid:=to_regprocedure('public.get_my_qa_organization_context()'); owner_oid oid; authenticated_oid oid;
BEGIN
 SELECT oid INTO STRICT owner_oid FROM pg_roles WHERE rolname='postgres';
 SELECT oid INTO STRICT authenticated_oid FROM pg_roles WHERE rolname='authenticated';
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=fn AND p.proowner=owner_oid AND p.prosecdef AND p.proconfig=ARRAY['search_path=""'])
 OR has_function_privilege('anon',fn,'EXECUTE') OR has_function_privilege('service_role',fn,'EXECUTE')
 OR NOT has_function_privilege('authenticated',fn,'EXECUTE')
 OR (SELECT count(*) FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a WHERE p.oid=fn)<>2
 OR EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a WHERE p.oid=fn
 AND (a.grantor<>owner_oid OR a.privilege_type<>'EXECUTE' OR (a.grantee<>owner_oid AND (a.grantee<>authenticated_oid OR a.is_grantable))))
 THEN RAISE EXCEPTION 'qa_org_context_acl_refused'; END IF;
END $post$;
SELECT p.oid::regprocedure::text AS function_signature,
 encode(sha256(convert_to((jsonb_build_object('oid',p.oid::text,'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',coalesce((SELECT jsonb_agg(jsonb_build_array(a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable) ORDER BY a.grantor,a.grantee,a.privilege_type,a.is_grantable) FROM aclexplode(p.proacl) a),'[]'::jsonb),'comment',obj_description(p.oid,'pg_proc')))::text,'UTF8')),'hex') AS provenance_sha256
FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_qa_organization_context()');

-- Capture immediately after installation, before exercising the rollback body.
SELECT set_config('risck_qa.org_context_rehearsal_provenance',
 encode(sha256(convert_to((jsonb_build_object('oid',p.oid::text,'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',coalesce((SELECT jsonb_agg(jsonb_build_array(a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable) ORDER BY a.grantor,a.grantee,a.privilege_type,a.is_grantable) FROM aclexplode(p.proacl) a),'[]'::jsonb),'comment',obj_description(p.oid,'pg_proc')))::text,'UTF8')),'hex'),true) AS original_rehearsal_provenance
FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_qa_organization_context()');
DO $rollback$
DECLARE expected text:=current_setting('risck_qa.org_context_rehearsal_provenance',true); actual text;
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

SELECT 'REHEARSAL_DROP_AND_ACL_CHECKS_PASSED' AS result,
 current_setting('risck_qa.org_context_rehearsal_provenance',true) AS original_rehearsal_provenance;
ROLLBACK;
BEGIN READ ONLY;
SELECT to_regprocedure('public.get_my_qa_organization_context()') IS NULL AS rehearsal_object_absent,
 to_regprocedure('public.get_my_mfa_bootstrap_context()') IS NOT NULL AS bootstrap_preserved,
 to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NOT NULL AS guard_preserved,
 (SELECT count(*) FROM supabase_migrations.schema_migrations) AS migration_count;
ROLLBACK;
