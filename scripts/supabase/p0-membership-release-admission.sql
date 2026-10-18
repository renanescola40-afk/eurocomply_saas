-- RISCK COMPLY: P0 membership release admission, metadata-only.
-- Execute read-only in the target database. This is not a migration.
-- A SCHEMA_CANDIDATE result is NOT permission to deploy or skip runtime tests.
with
  migration_gate as (
    select count(*)::integer as applied_count
    from supabase_migrations.schema_migrations
    where version in (
      '20261015235500', -- Enterprise MFA
      '20261018023000', -- P0-B last owner removal
      '20261018113000', -- P0-C signed removal
      '20261018160000', -- P0-D signed role change
      '20261018183000'  -- P0-E seat suspension
    )
  ),
  function_gate as (
    select
      coalesce(
        position('tenant_mfa_satisfied(p_organization_id)' in
          pg_get_functiondef(to_regprocedure('app_private.enterprise_member_can_read(uuid)'))
        ) > 0, false
      ) as mfa_read,
      coalesce(
        position('tenant_mfa_satisfied(p_organization_id)' in
          pg_get_functiondef(to_regprocedure('app_private.enterprise_member_can_manage(uuid)'))
        ) > 0, false
      ) as mfa_manage,
      coalesce(
        position('v_active_owner_count' in
          pg_get_functiondef(to_regprocedure('public.remove_organization_member_atomic(uuid,uuid,uuid,text)'))
        ) > 0, false
      ) as owner_removal,
      to_regprocedure('public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)') is not null as removal_audited,
      to_regprocedure('public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)') is not null as role_audited,
      coalesce(
        position('v_active_owner_count' in
          pg_get_functiondef(to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)'))
        ) > 0 and position('last_owner' in
          pg_get_functiondef(to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)'))
        ) > 0, false
      ) as owner_suspension
  ),
  rls_gate as (
    select count(*)::integer as public_tables,
      count(*) filter (where c.relrowsecurity and c.relforcerowsecurity)::integer as public_rls_force
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
  ),
  acl_gate as (
    select count(*) filter (
        where has_function_privilege('anon', p.oid, 'EXECUTE')
           or has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )::integer as public_definer_exposed
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
  )
select m.applied_count,
  5 as required_migration_count,
  f.mfa_read, f.mfa_manage, f.owner_removal,
  f.removal_audited, f.role_audited, f.owner_suspension,
  r.public_tables, r.public_rls_force,
  a.public_definer_exposed,
  case when m.applied_count=5
    and f.mfa_read and f.mfa_manage and f.owner_removal
    and f.removal_audited and f.role_audited and f.owner_suspension
    and r.public_tables = r.public_rls_force
    and a.public_definer_exposed = 0
  then 'SCHEMA_CANDIDATE_REQUIRES_RUNTIME_ACCEPTANCE'
  else 'BLOCKED_SOURCE_DB_DRIFT'
  end as schema_admission
from migration_gate m cross join function_gate f cross join rls_gate r cross join acl_gate a;
