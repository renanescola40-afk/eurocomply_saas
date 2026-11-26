-- QA ONLY, project zrxrrfbllsxtleyxjpsz. Independent database/security review required.
-- Run after the separately reviewed current-organization installer, in an exclusive DDL window.
-- Provision the login password through the secret manager, never through a logged SQL console.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='20s';
DO $preflight$
BEGIN
  IF current_user <> 'postgres' OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::int/10000 <> 17
    OR to_regprocedure('public.get_my_qa_organization_context()') IS NULL
    OR to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NULL
    OR to_regprocedure('public.create_ai_system_atomic(uuid,uuid,jsonb)') IS NULL
    OR to_regprocedure('public.reassess_ai_system_atomic(uuid,uuid,timestamptz,uuid,jsonb)') IS NULL
    OR to_regprocedure('public.append_audit_event_chained(uuid,uuid,uuid,text,text,text,jsonb,timestamptz,text,text,text,text)') IS NULL
    OR to_regprocedure('app_private.qa_inventory_audit_head(uuid)') IS NOT NULL
    OR to_regprocedure('app_private.qa_inventory_mutate(uuid,uuid,timestamptz,jsonb)') IS NOT NULL
    OR to_regprocedure('app_private.qa_inventory_append(uuid,jsonb)') IS NOT NULL
    OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations
      WHERE version IN ('20261120134634','20261120134701','20261126172143'))<>3
    OR has_function_privilege('authenticated','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'qa_inventory_preflight_refused'; END IF;
END $preflight$;

CREATE ROLE qa_inventory_writer LOGIN NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO qa_inventory_writer;
GRANT USAGE ON SCHEMA app_private, public TO qa_inventory_writer;

CREATE FUNCTION app_private.qa_inventory_audit_head(p_organization_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $head$
DECLARE v_actor uuid; v_head text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  SELECT a.event_hash INTO v_head FROM public.audit_events a
    WHERE a.organization_id=p_organization_id AND a.event_hash IS NOT NULL
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN v_head;
END $head$;

-- The application calls this and qa_inventory_append on the same pg Client
-- before COMMIT; exceptions cause ROLLBACK. No raw table or atomic privileges.
CREATE FUNCTION app_private.qa_inventory_mutate(
  p_organization_id uuid, p_system_id uuid, p_expected_updated_at timestamptz,
  p_system jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $mutate$
DECLARE v_actor uuid; v_transition record; v_system jsonb;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  IF p_system IS NULL OR jsonb_typeof(p_system)<>'object'
    OR (p_system_id IS NULL AND p_expected_updated_at IS NOT NULL)
    OR (p_system_id IS NOT NULL AND p_expected_updated_at IS NULL) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_request' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_organization_id::text));
  IF p_system_id IS NULL THEN
    SELECT t.outcome,t.system INTO v_transition FROM public.create_ai_system_atomic(
      p_organization_id,v_actor,p_system) t;
  ELSE
    SELECT t.outcome,t.system INTO v_transition FROM public.reassess_ai_system_atomic(
      p_system_id,p_organization_id,p_expected_updated_at,v_actor,p_system) t;
  END IF;
  IF v_transition.outcome IS NULL THEN RAISE EXCEPTION 'qa_inventory_transition_missing'; END IF;
  IF v_transition.outcome NOT IN ('created','updated') THEN
    RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome);
  END IF;
  v_system:=v_transition.system;
  IF v_system->>'organization_id' IS DISTINCT FROM p_organization_id::text
    OR (p_system_id IS NOT NULL AND v_system->>'id' IS DISTINCT FROM p_system_id::text)
    THEN
    RAISE EXCEPTION 'qa_inventory_transition_mismatch';
  END IF;
  RETURN pg_catalog.jsonb_build_object('outcome',v_transition.outcome,'system',v_system);
END $mutate$;

CREATE FUNCTION app_private.qa_inventory_append(p_organization_id uuid,p_audit jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $append$
DECLARE v_actor uuid; v_id uuid; v_created timestamptz; v_previous text;
  v_hash text; v_signature text;
BEGIN
  v_actor:=app_private.qa_require_ai_inventory_actor(p_organization_id);
  IF NOT EXISTS(SELECT 1 FROM public.get_my_qa_organization_context() c
    WHERE c.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_sso_denied' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_id:=(p_audit->>'id')::uuid;
    v_created:=(p_audit->>'createdAt')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END;
  v_previous:=p_audit->>'previousHash';
  v_hash:=p_audit->>'eventHash';
  v_signature:=p_audit->>'signature';
  IF v_id IS NULL OR v_created IS NULL
    OR abs(extract(epoch FROM (pg_catalog.now()-v_created)))>300
    OR v_hash !~ '^[a-f0-9]{64}$' OR v_signature !~ '^[a-f0-9]{64}$'
    OR p_audit->>'action' NOT IN ('ai_system_created','ai_system_reassessed')
    OR p_audit->>'entityType' IS DISTINCT FROM 'ai_system'
    OR p_audit->>'organizationId' IS DISTINCT FROM p_organization_id::text
    OR p_audit->>'actorUserId' IS DISTINCT FROM v_actor::text
    OR jsonb_typeof(p_audit->'metadata') IS DISTINCT FROM 'object'
    OR NOT EXISTS(SELECT 1 FROM public.ai_systems s WHERE s.id::text=p_audit->>'entityId'
      AND s.organization_id=p_organization_id) THEN
    RAISE EXCEPTION 'qa_inventory_invalid_audit' USING ERRCODE='22023';
  END IF;
  PERFORM public.append_audit_event_chained(v_id,p_organization_id,v_actor,
    p_audit->>'action','ai_system',p_audit->>'entityId',p_audit->'metadata',
    v_created,v_previous,v_hash,v_signature,'sha256');
END $append$;

REVOKE ALL ON FUNCTION app_private.qa_inventory_audit_head(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,timestamptz,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION app_private.qa_inventory_append(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,timestamptz,jsonb) TO qa_inventory_writer;
GRANT EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb) TO qa_inventory_writer;
DO $post$
BEGIN
  IF has_function_privilege('anon','app_private.qa_inventory_mutate(uuid,uuid,timestamptz,jsonb)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_mutate(uuid,uuid,timestamptz,jsonb)','EXECUTE')
  OR has_function_privilege('service_role','app_private.qa_inventory_mutate(uuid,uuid,timestamptz,jsonb)','EXECUTE')
  OR has_function_privilege('authenticated','app_private.qa_inventory_append(uuid,jsonb)','EXECUTE')
  OR has_function_privilege('anon','app_private.qa_inventory_audit_head(uuid)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_mutate(uuid,uuid,timestamptz,jsonb)','EXECUTE')
  OR NOT has_function_privilege('qa_inventory_writer','app_private.qa_inventory_append(uuid,jsonb)','EXECUTE')
  OR has_function_privilege('qa_inventory_writer','public.create_ai_system_atomic(uuid,uuid,jsonb)','EXECUTE')
  OR has_table_privilege('qa_inventory_writer','public.ai_systems','INSERT')
  THEN RAISE EXCEPTION 'qa_inventory_acl_refused'; END IF;
END $post$;
COMMIT;
