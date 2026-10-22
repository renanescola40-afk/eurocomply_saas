-- G1 reviewed QA-only reconciliation overlay for provider ledger migration 18 (20260804224915).
-- NEVER run this as a production migration or modify Supabase production migration statements.
-- Source provider migration requires 9 function signatures that the clean replay prefix does not create.
-- This overlay hardens every existing function, requires both historical member helpers,
-- and records optional absence for downstream fail-closed final ACL postconditions.
-- Owner/source lineage: main 70d3545f414d063379d481fd238aed563e05edda
-- Original source: supabase/migrations/20260804224915_live_security_definer_acl_hardening.sql
-- Original blob SHA: e82dd33f0f5a5052572ee36228667fe14db7eb74
-- Apply in a single caller-owned QA transaction; no BEGIN/COMMIT provided here.

DO $g1_qa18_acl$
DECLARE
  spec record;
  procedure_signature regprocedure;
  optional_absent_count integer := 0;
BEGIN
  FOR spec IN
    SELECT *
    FROM (VALUES
      ('public.delete_user_account(uuid)', false, false, 'pg_catalog, auth'),
      ('public.is_org_member(uuid)', true, true, NULL),
      ('public.has_org_role(uuid,text[])', true, true, NULL),
      ('public.has_org_write_role(uuid)', false, true, NULL),
      ('public.live_rls_validation_is_org_member(uuid)', false, true, NULL),
      ('public.current_jwt_subject()', false, true, 'pg_catalog'),
      ('public.current_legacy_user_id()', false, true, 'pg_catalog, public'),
      ('public.current_clerk_user_id()', false, true, 'pg_catalog, public'),
      ('public.prevent_client_notification_scope_change()', false, false, NULL),
      ('public.set_ai_systems_updated_at()', false, false, 'pg_catalog, public'),
      ('public.set_ai_incidents_updated_at()', false, false, 'pg_catalog, public')
    ) AS catalog(signature, required_for_prefix, authenticated_allowed, effective_search_path)
  LOOP
    procedure_signature := to_regprocedure(spec.signature);
    IF procedure_signature IS NULL THEN
      IF spec.required_for_prefix THEN
        RAISE EXCEPTION 'G1 QA18 prerequisite missing: %', spec.signature;
      END IF;
      optional_absent_count := optional_absent_count + 1;
      CONTINUE;
    END IF;

    IF spec.effective_search_path IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = %s', procedure_signature, spec.effective_search_path);
    END IF;

    -- Do not permit PUBLIC's inherited EXECUTE on privileged functions.
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', procedure_signature);
    IF spec.authenticated_allowed THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', procedure_signature);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', procedure_signature);
    END IF;
  END LOOP;

  IF optional_absent_count <> 9 THEN
    RAISE EXCEPTION 'G1 QA18 unexpected optional helper inventory: % (expected 9)', optional_absent_count;
  END IF;

  IF has_function_privilege('anon', 'public.is_org_member(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.has_org_role(uuid,text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'G1 QA18 anonymous EXECUTE still allowed';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.is_org_member(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.has_org_role(uuid,text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'G1 QA18 required authenticated helper ACL missing';
  END IF;
END $g1_qa18_acl$;
