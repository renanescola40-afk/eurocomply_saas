-- G1 QA-only safe provenance overlay for migration index 19 / version 20260804230433.
-- Original main SQL unchanged. Blob SHA: 513a04a0e244dd5acd4a3e54f270334e84dba4ae
-- Only absent PRE-MATERIALIZATION helper moves are skipped, then wrappers are CREATED and guarded.
-- No BEGIN/COMMIT; caller MUST use isolated QA transaction and ROLLBACK.

-- enterprise-migration-review: approved
-- Keep privileged RLS helpers callable by policies without exposing them as
-- PostgREST RPC endpoints in the public schema.


create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated, service_role;

-- ALTER ... SET SCHEMA preserves each function OID, so PostgreSQL rewrites all
-- dependent policy expressions atomically instead of requiring policy churn.
alter function public.is_org_member(uuid) set schema app_private;
alter function public.has_org_role(uuid, text[]) set schema app_private;
DO $g1_optional_write_helper$
BEGIN
  IF to_regprocedure('public.has_org_write_role(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.has_org_write_role(uuid) SET SCHEMA app_private;
  END IF;
END $g1_optional_write_helper$;
DO $g1_optional_validation_helper$
BEGIN
  IF to_regprocedure('public.live_rls_validation_is_org_member(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.live_rls_validation_is_org_member(uuid) SET SCHEMA app_private;
  END IF;
END $g1_optional_validation_helper$;

-- These two wrappers referenced their former public-qualified dependencies in
-- their SQL bodies, so replace them after the atomic move.
create or replace function app_private.has_org_write_role(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, app_private
as $$
  select app_private.has_org_role(
    target_organization_id,
    array['owner', 'admin', 'editor']
  );
$$;

create or replace function app_private.live_rls_validation_is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, app_private
as $$
  select app_private.is_org_member(target_organization_id);
$$;

revoke all on function app_private.is_org_member(uuid) from public, anon;
revoke all on function app_private.has_org_role(uuid, text[]) from public, anon;
revoke all on function app_private.has_org_write_role(uuid) from public, anon;
revoke all on function app_private.live_rls_validation_is_org_member(uuid) from public, anon;

grant execute on function app_private.is_org_member(uuid) to authenticated, service_role;
grant execute on function app_private.has_org_role(uuid, text[]) to authenticated, service_role;
grant execute on function app_private.has_org_write_role(uuid) to authenticated, service_role;
grant execute on function app_private.live_rls_validation_is_org_member(uuid) to authenticated, service_role;

comment on schema app_private is
  'Non-exposed schema for privileged helpers used internally by RLS policies.';

-- Required QA-only proof that no privileged helper is exposed by public PostgREST.
DO $g1_private_guard$
BEGIN
  IF to_regprocedure('public.is_org_member(uuid)') IS NOT NULL
     OR to_regprocedure('public.has_org_role(uuid,text[])') IS NOT NULL
     OR to_regprocedure('public.has_org_write_role(uuid)') IS NOT NULL
     OR to_regprocedure('public.live_rls_validation_is_org_member(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'G1 QA19 a privileged member helper remains exposed in public';
  END IF;
  IF to_regprocedure('app_private.is_org_member(uuid)') IS NULL
     OR to_regprocedure('app_private.has_org_role(uuid,text[])') IS NULL
     OR to_regprocedure('app_private.has_org_write_role(uuid)') IS NULL
     OR to_regprocedure('app_private.live_rls_validation_is_org_member(uuid)') IS NULL THEN
    RAISE EXCEPTION 'G1 QA19 an expected private helper is absent';
  END IF;
  IF has_schema_privilege('anon','app_private','USAGE') THEN
    RAISE EXCEPTION 'G1 QA19 private helper schema available to anon';
  END IF;
  IF NOT has_schema_privilege('authenticated','app_private','USAGE') THEN
    RAISE EXCEPTION 'G1 QA19 authenticated policies cannot resolve private helpers';
  END IF;
END $g1_private_guard$;
