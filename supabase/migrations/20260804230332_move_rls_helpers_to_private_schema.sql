-- enterprise-migration-review: approved
-- Keep privileged RLS helpers callable by policies without exposing them as
-- PostgREST RPC endpoints in the public schema.

begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated, service_role;

-- ALTER ... SET SCHEMA preserves each function OID, so PostgreSQL rewrites all
-- dependent policy expressions atomically instead of requiring policy churn.
alter function public.is_org_member(uuid) set schema app_private;
alter function public.has_org_role(uuid, text[]) set schema app_private;
alter function public.has_org_write_role(uuid) set schema app_private;
alter function public.live_rls_validation_is_org_member(uuid) set schema app_private;

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

commit;
