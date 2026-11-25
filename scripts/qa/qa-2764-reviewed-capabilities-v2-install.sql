-- #2764 V2 REVIEW CANDIDATE ONLY. Do not execute before independent approval.
-- QA project zrxrrfbllsxtleyxjpsz only; provider project ID verified out of band.
-- Original blobs: 7432fae6328e5aa9ed6c667a3574141ed2a71e78 / 63637b14a4eb35a600171124e7c8a00c8b9e71c0.
-- No exposed inventory writer. Mandatory SSO, quotas, derived risk and signed
-- audit transaction remain requirements of the future write boundary.
-- Run in an exclusive governed DDL window. Store exact returned fingerprints
-- externally in the change record before any rollback; never derive them at rollback time.
BEGIN;
SET LOCAL search_path = pg_catalog;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';
DO $preflight$
DECLARE d record; fn oid;
BEGIN
 IF current_user <> 'postgres' OR current_setting('server_version_num')::int/10000 <> 17
 OR (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('20261120134634','20261120134701'))<>2
 OR (SELECT count(*) FROM public.organizations)<>2
 THEN RAISE EXCEPTION 'qa_install_environment_refused'; END IF;
 IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE (n.nspname='public' AND p.proname IN ('get_my_mfa_bootstrap_context','qa_create_ai_system_for_session','qa_reassess_ai_system_for_session'))
 OR (n.nspname='app_private' AND p.proname='qa_require_ai_inventory_actor'))
 THEN RAISE EXCEPTION 'qa_install_existing_name_refused'; END IF;
 FOR d IN SELECT * FROM (VALUES
 ('app_private.has_org_role(uuid,text[])','15a1ae5544a33c6beeb584aa8d55657039429276c389f40d153925328d92d5c8'),
 ('public.tenant_mfa_satisfied(uuid)','b56fc87ef78cb5d2c274de70e52eca8b93b2088e61cbfd931a9484abc21e0158'),
 ('public.current_clerk_user_id()','24833857ce57e88e907c63f0c205b857dc5ab7aa3c0a790ec30d66a6c8d2978b'),
 ('public.current_legacy_user_id()','67b40732672bb5a01b66d5ea91349136a8dfad374e1ca63e8a64ee4a90e7a454'),
 ('app_private.resolve_commercial_plan(uuid)','36186b8f0b95bf3232bfab6b086f3bf88911c53365e9fd688f58f21f50e4451d')
 ) AS expected(signature,fingerprint) LOOP
  fn:=to_regprocedure(d.signature);
  IF fn IS NULL OR encode(sha256(convert_to(pg_get_functiondef(fn),'UTF8')),'hex') IS DISTINCT FROM d.fingerprint
    OR NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=fn AND p.prosecdef AND pg_get_userbyid(p.proowner)='postgres')
    OR has_function_privilege('anon',fn,'EXECUTE')
  THEN RAISE EXCEPTION 'qa_install_dependency_drift: %',d.signature; END IF;
 END LOOP;
 IF has_function_privilege('authenticated','app_private.resolve_commercial_plan(uuid)','EXECUTE')
 OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('anon','public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'qa_install_privileged_acl_refused'; END IF;
END $preflight$;

CREATE FUNCTION public.get_my_mfa_bootstrap_context()
RETURNS TABLE (organization_id uuid, require_mfa_for_all_users boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $mfa_bootstrap$
DECLARE
  actor_id uuid;
  actor_session_id uuid;
  context_rows integer;
BEGIN
  actor_id := auth.uid();
  IF actor_id IS NULL
     OR COALESCE(auth.jwt() ->> 'role', '') <> 'authenticated'
     OR COALESCE(auth.jwt() ->> 'is_anonymous', 'false') <> 'false'
  THEN
    RAISE EXCEPTION 'mfa_bootstrap_unauthorized' USING ERRCODE = '42501';
  END IF;

  -- A signed JWT can remain valid until exp after logout. Enforce the live
  -- session row for this sensitive pre-MFA discovery operation.
  IF COALESCE(auth.jwt() ->> 'session_id', '') = '' THEN
    RAISE EXCEPTION 'mfa_bootstrap_session_unavailable' USING ERRCODE = '42501';
  END IF;
  BEGIN
    actor_session_id := (auth.jwt() ->> 'session_id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'mfa_bootstrap_session_unavailable' USING ERRCODE = '42501';
  END;

  IF NOT EXISTS (
    SELECT 1 FROM auth.sessions AS s
    WHERE s.id = actor_session_id AND s.user_id = actor_id
      AND (s.not_after IS NULL OR s.not_after > pg_catalog.now())
  ) THEN
    RAISE EXCEPTION 'mfa_bootstrap_session_unavailable' USING ERRCODE = '42501';
  END IF;

  -- A missing policy for an otherwise eligible active membership is an
  -- unavailable security control; NEVER interpret it as MFA not required.
  IF EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    LEFT JOIN public.organization_security_settings AS settings
      ON settings.organization_id = m.organization_id
    WHERE m.user_id = actor_id
      AND pg_catalog.lower(pg_catalog.btrim(m.status)) = 'active'
      AND pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(m.role), '^org:', '', 'i'))
          = ANY (ARRAY[
            'owner','proprietario','proprietário','dono',
            'admin','administrator','administrador',
            'editor','manager','gestor','compliance-manager','compliance_manager','compliance manager',
            'member','membro','viewer','visualizador','read_only','readonly','leitor'
          ])
      AND (settings.organization_id IS NULL OR settings.require_mfa_for_all_users IS NULL)
  ) THEN
    RAISE EXCEPTION 'mfa_bootstrap_policy_unavailable' USING ERRCODE = 'P0001';
  END IF;

  -- Return at most 20 distinct own tenants. Fail rather than silently truncate.
  RETURN QUERY
    SELECT DISTINCT m.organization_id, settings.require_mfa_for_all_users
    FROM public.organization_members AS m
    JOIN public.organization_security_settings AS settings
      ON settings.organization_id = m.organization_id
    WHERE m.user_id = actor_id
      AND pg_catalog.lower(pg_catalog.btrim(m.status)) = 'active'
      AND pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(m.role), '^org:', '', 'i'))
          = ANY (ARRAY[
            'owner','proprietario','proprietário','dono',
            'admin','administrator','administrador',
            'editor','manager','gestor','compliance-manager','compliance_manager','compliance manager',
            'member','membro','viewer','visualizador','read_only','readonly','leitor'
          ])
    ORDER BY m.organization_id LIMIT 21;
  GET DIAGNOSTICS context_rows = ROW_COUNT;
  IF context_rows > 20 THEN
    RAISE EXCEPTION 'mfa_bootstrap_too_many_organizations' USING ERRCODE = 'P0001';
  END IF;
END;
$mfa_bootstrap$;

-- Explicitly revoke default PUBLIC EXECUTE in the same transaction in which
-- the function is created. No existing broad/privileged RPC grants change.
REVOKE ALL ON FUNCTION public.get_my_mfa_bootstrap_context()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_mfa_bootstrap_context()
  TO authenticated;

COMMENT ON FUNCTION public.get_my_mfa_bootstrap_context() IS
  'QA-only #2764 v2: signed own-tenant MFA discovery; provenance-bound rollback';

CREATE FUNCTION app_private.qa_require_ai_inventory_actor(p_organization_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_session_id text := nullif(auth.jwt() ->> 'session_id', '');
BEGIN
  IF p_organization_id IS NULL
     OR v_actor IS NULL
     OR v_session_id IS NULL
     OR coalesce(auth.jwt() ->> 'role', '') <> 'authenticated'
     OR coalesce(auth.jwt() ->> 'aal', '') <> 'aal2'
     OR coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'false' THEN
    RAISE EXCEPTION 'qa_ai_inventory_access_denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.sessions AS s
    WHERE s.id::text = v_session_id
      AND s.user_id = v_actor
      AND s.aal::text = 'aal2'
      AND s.factor_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM auth.mfa_factors AS f
                  WHERE f.id=s.factor_id AND f.user_id=v_actor AND f.status::text='verified')
      AND (s.not_after IS NULL OR s.not_after > pg_catalog.now())
  ) THEN
    RAISE EXCEPTION 'qa_ai_inventory_access_denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members AS m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = v_actor
      AND m.status = 'active'
      AND m.role IN ('owner', 'admin', 'editor', 'compliance_manager')
  ) THEN
    RAISE EXCEPTION 'qa_ai_inventory_access_denied' USING ERRCODE = '42501';
  END IF;

  -- Existing tenant policy and provider-backed/signed-contract commercial truth,
  -- not caller metadata, Stripe TEST history or a legacy local entitlement row.
  IF app_private.has_org_role(
      p_organization_id,
      ARRAY['owner', 'admin', 'editor', 'compliance_manager']::text[]
    ) IS DISTINCT FROM TRUE
    OR (app_private.resolve_commercial_plan(p_organization_id) IN ('starter','professional','business','enterprise')) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'qa_ai_inventory_access_denied' USING ERRCODE = '42501';
  END IF;

  RETURN v_actor;
END;
$function$;

REVOKE ALL ON FUNCTION app_private.qa_require_ai_inventory_actor(uuid)
FROM PUBLIC, anon, authenticated, service_role;


COMMENT ON FUNCTION app_private.qa_require_ai_inventory_actor(uuid) IS
 'QA-only #2764 v2: private AAL2 assertion; no inventory write capability';

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
COMMIT;
