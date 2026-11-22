-- RISCK COMPLY / FUN-QA. REVIEW CANDIDATE ONLY.
-- QA project zrxrrfbllsxtleyxjpsz ONLY; requires separate rollback authorization.
-- Never roll back or alter existing privileged inventory atomics.

BEGIN;

REVOKE ALL ON FUNCTION
  public.qa_reassess_ai_system_for_session(uuid,uuid,timestamptz,jsonb)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION
  public.qa_create_ai_system_for_session(uuid,jsonb)
FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS
  public.qa_reassess_ai_system_for_session(uuid,uuid,timestamptz,jsonb);
DROP FUNCTION IF EXISTS
  public.qa_create_ai_system_for_session(uuid,jsonb);
DROP FUNCTION IF EXISTS
  app_private.qa_require_ai_inventory_actor(uuid);

COMMIT;
