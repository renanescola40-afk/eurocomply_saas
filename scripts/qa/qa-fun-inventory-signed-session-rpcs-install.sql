-- RISCK COMPLY / FUN-QA. REVIEW CANDIDATE ONLY. DO NOT EXECUTE UNTIL
-- independent Security + Database approval and a QA-only exact-project change plan.
-- Never run against Supabase Production. Do not enable customer billing from this.
--
-- Install target (after approval): isolated QA project zrxrrfbllsxtleyxjpsz.
-- The existing privileged atomics retain their restricted EXECUTE ACLs.
-- This installs ONLY an unexposed private assertion, and no write capability.
-- All statements are transactional; default PUBLIC function EXECUTE is revoked
-- in the same transaction before it is committed.

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
  -- Refuse installation over an existing helper or exposed bridge. Do not
  -- silently replace installed functions or inherit wider legacy grants.
  IF to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NOT NULL
     OR to_regprocedure('public.qa_create_ai_system_for_session(uuid,jsonb)') IS NOT NULL
     OR to_regprocedure('public.qa_reassess_ai_system_for_session(uuid,uuid,timestamptz,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'qa_ai_inventory_existing_bridge_requires_independent_review'
      USING ERRCODE = '55000';
  END IF;
END;
$preflight$;

-- Private assertion function. It never accepts a caller-selected actor ID.
-- PostgREST validates the incoming Supabase Auth JWT before setting auth.jwt().
-- Auth sessions table lookup also fails closed for deleted/expired/AAL1 sessions.
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

-- FAIL-CLOSED REVIEW MILESTONE. No exposed write RPCs are created here.
-- The earlier public SECURITY DEFINER bridges would have bypassed BOTH the
-- server's classification derivation and fail-closed chained audit append.
-- An AAL2 session, membership and a plan do not establish classification or
-- audit integrity. A future independently reviewed transactional write
-- boundary must enforce those before any authenticated EXECUTE is granted.
-- Do not create or grant public.qa_create_ai_system_for_session or
-- public.qa_reassess_ai_system_for_session from this installer.

COMMIT;
