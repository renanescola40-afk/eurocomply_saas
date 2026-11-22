-- RISCK COMPLY / FUN-QA. REVIEW CANDIDATE ONLY. DO NOT EXECUTE UNTIL
-- independent Security + Database approval and a QA-only exact-project change plan.
-- Never run against Supabase Production. Do not enable customer billing from this.
--
-- Install target (after approval): isolated QA project zrxrrfbllsxtleyxjpsz.
-- The existing privileged atomic procedures retain service_role-only EXECUTE.
-- Entire capability is installed transactionally; partial grants are not committed.

BEGIN;

DO $preflight$
BEGIN
  IF to_regprocedure('public.create_ai_system_atomic(uuid,uuid,jsonb)') IS NULL
     OR to_regprocedure('public.reassess_ai_system_atomic(uuid,uuid,timestamp with time zone,uuid,jsonb)') IS NULL
     OR to_regclass('public.organization_members') IS NULL
     OR to_regclass('auth.sessions') IS NULL THEN
    RAISE EXCEPTION 'qa_ai_inventory_schema_contract_unavailable' USING ERRCODE = '55000';
  END IF;

  IF has_function_privilege('anon',
       'public.create_ai_system_atomic(uuid,uuid,jsonb)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('authenticated',
       'public.create_ai_system_atomic(uuid,uuid,jsonb)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon',
       'public.reassess_ai_system_atomic(uuid,uuid,timestamp with time zone,uuid,jsonb)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('authenticated',
       'public.reassess_ai_system_atomic(uuid,uuid,timestamp with time zone,uuid,jsonb)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'qa_ai_inventory_privileged_rpc_acl_not_restricted' USING ERRCODE = '55000';
  END IF;
END;
$preflight$;

-- Private assertion function. It never accepts a caller-selected actor ID.
-- PostgREST validates the incoming Supabase Auth JWT before setting auth.jwt().
-- Auth sessions table lookup also fails closed for deleted/expired/AAL1 sessions.
CREATE OR REPLACE FUNCTION app_private.qa_require_ai_inventory_actor(p_organization_id uuid)
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
     OR coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'qa_ai_inventory_access_denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.sessions AS s
    WHERE s.id::text = v_session_id
      AND s.user_id = v_actor
      AND s.aal::text = 'aal2'
      AND s.factor_id IS NOT NULL
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
  IF NOT app_private.has_org_role(
      p_organization_id,
      ARRAY['owner', 'admin', 'editor', 'compliance_manager']::text[]
    )
    OR app_private.resolve_commercial_plan(p_organization_id) IS NULL THEN
    RAISE EXCEPTION 'qa_ai_inventory_access_denied' USING ERRCODE = '42501';
  END IF;

  RETURN v_actor;
END;
$function$;

REVOKE ALL ON FUNCTION app_private.qa_require_ai_inventory_actor(uuid)
FROM PUBLIC, anon, authenticated;

-- The public RPC exposes only an authorized, actor-derived bridge.
-- Do not grant EXECUTE on public.create_ai_system_atomic to authenticated.
CREATE OR REPLACE FUNCTION public.qa_create_ai_system_for_session(
  p_organization_id uuid,
  p_system jsonb
)
RETURNS TABLE(outcome text, system jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := app_private.qa_require_ai_inventory_actor(p_organization_id);
  RETURN QUERY
    SELECT created.outcome, created.system
    FROM public.create_ai_system_atomic(p_organization_id, v_actor, p_system) AS created;
END;
$function$;

REVOKE ALL ON FUNCTION public.qa_create_ai_system_for_session(uuid,jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qa_create_ai_system_for_session(uuid,jsonb)
TO authenticated;

CREATE OR REPLACE FUNCTION public.qa_reassess_ai_system_for_session(
  p_system_id uuid,
  p_organization_id uuid,
  p_expected_updated_at timestamptz,
  p_patch jsonb
)
RETURNS TABLE(outcome text, system jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := app_private.qa_require_ai_inventory_actor(p_organization_id);
  RETURN QUERY
    SELECT reassessed.outcome, reassessed.system
    FROM public.reassess_ai_system_atomic(
      p_system_id, p_organization_id, p_expected_updated_at, v_actor, p_patch
    ) AS reassessed;
END;
$function$;

REVOKE ALL ON FUNCTION
  public.qa_reassess_ai_system_for_session(uuid,uuid,timestamptz,jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.qa_reassess_ai_system_for_session(uuid,uuid,timestamptz,jsonb)
TO authenticated;

COMMIT;
