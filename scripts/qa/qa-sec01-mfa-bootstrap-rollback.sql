-- #2754/#2764: review candidate; DO NOT EXECUTE without independent
-- Security/Database approval of the exact QA install and rollback plan.
-- Isolated Supabase QA zrxrrfbllsxtleyxjpsz only. Never Production.
-- Use only after deployment provenance confirms that the installed function
-- belongs to approved source blob 7432fae6328e5aa9ed6c667a3574141ed2a71e78.
-- If the installed definition, owner or ACL has changed, stop for review.
BEGIN;
DO $preflight$
DECLARE
  fn oid := to_regprocedure('public.get_my_mfa_bootstrap_context()');
BEGIN
  IF fn IS NULL THEN
    RAISE EXCEPTION 'qa_mfa_bootstrap_not_installed' USING ERRCODE = '55000';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid = fn AND p.prosecdef AND p.provolatile = 's'
      AND pg_catalog.obj_description(p.oid,'pg_proc') =
      'Review-only source candidate #2754/#2764: signed user-bound AAL1 own-tenant MFA policy discovery; no privileges for anon'
  ) OR pg_catalog.has_function_privilege('anon',fn,'EXECUTE')
    OR NOT pg_catalog.has_function_privilege('authenticated',fn,'EXECUTE')
  THEN
    RAISE EXCEPTION 'qa_mfa_bootstrap_rollback_scope_mismatch' USING ERRCODE = '55000';
  END IF;
END;
$preflight$;
-- RESTRICT is deliberate: do not silently remove any dependent objects.
DROP FUNCTION public.get_my_mfa_bootstrap_context() RESTRICT;
COMMIT;
