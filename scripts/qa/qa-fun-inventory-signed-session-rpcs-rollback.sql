-- RISCK COMPLY / FUN-QA staged AAL2 assertion rollback (REVIEW ONLY).
-- Supabase isolated QA zrxrrfbllsxtleyxjpsz only. Independently authorize DDL.
-- This plan created no public RPCs. Existing privileged atomic RPCs are untouched.
BEGIN;
DO $preflight$
BEGIN
  -- An earlier/foreign installation of exposed wrappers cannot safely be
  -- cleaned up by this narrower rollback; require its own approval and plan.
  IF to_regprocedure('public.qa_create_ai_system_for_session(uuid,jsonb)') IS NOT NULL
     OR to_regprocedure('public.qa_reassess_ai_system_for_session(uuid,uuid,timestamptz,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'qa_inventory_exposed_bridge_requires_separate_rollback'
      USING ERRCODE = '55000';
  END IF;
END;
$preflight$;
DROP FUNCTION IF EXISTS app_private.qa_require_ai_inventory_actor(uuid);
COMMIT;
