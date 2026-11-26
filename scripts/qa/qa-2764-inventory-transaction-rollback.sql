-- QA ONLY. Independent review and exact installed provenance required.
-- Do not run while requests use qa_inventory_writer; remove QA app secret first.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='20s';
DO $preflight$
BEGIN
  IF current_user <> 'postgres' OR current_setting('server_version_num')::int/10000<>17
    OR to_regprocedure('app_private.qa_inventory_audit_head(uuid)') IS NULL
    OR to_regprocedure('app_private.qa_inventory_mutate(uuid,uuid,timestamptz,jsonb)') IS NULL
    OR to_regprocedure('app_private.qa_inventory_append(uuid,jsonb)') IS NULL
    OR to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NULL
    OR to_regprocedure('public.get_my_qa_organization_context()') IS NULL
    OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qa_inventory_writer')
    OR EXISTS(SELECT 1 FROM pg_stat_activity WHERE usename='qa_inventory_writer' AND pid<>pg_backend_pid())
  THEN RAISE EXCEPTION 'qa_inventory_rollback_refused'; END IF;
END $preflight$;
REVOKE EXECUTE ON FUNCTION app_private.qa_inventory_append(uuid,jsonb) FROM qa_inventory_writer;
REVOKE EXECUTE ON FUNCTION app_private.qa_inventory_mutate(uuid,uuid,timestamptz,jsonb) FROM qa_inventory_writer;
REVOKE EXECUTE ON FUNCTION app_private.qa_inventory_audit_head(uuid) FROM qa_inventory_writer;
DROP FUNCTION app_private.qa_inventory_append(uuid,jsonb) RESTRICT;
DROP FUNCTION app_private.qa_inventory_mutate(uuid,uuid,timestamptz,jsonb) RESTRICT;
DROP FUNCTION app_private.qa_inventory_audit_head(uuid) RESTRICT;
REVOKE USAGE ON SCHEMA app_private,public FROM qa_inventory_writer;
REVOKE CONNECT ON DATABASE postgres FROM qa_inventory_writer;
DROP ROLE qa_inventory_writer;
-- Existing V2 and the separately reviewed organization context are untouched.
DO $post$
BEGIN
  IF to_regprocedure('app_private.qa_inventory_mutate(uuid,uuid,timestamptz,jsonb)') IS NOT NULL
    OR to_regprocedure('app_private.qa_require_ai_inventory_actor(uuid)') IS NULL
    OR to_regprocedure('public.get_my_qa_organization_context()') IS NULL
  THEN RAISE EXCEPTION 'qa_inventory_rollback_postcondition_failed'; END IF;
END $post$;
COMMIT;
