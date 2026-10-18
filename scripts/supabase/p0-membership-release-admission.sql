-- RISCK COMPLY: P0 membership release admission, read-only schema and aggregate integrity.
-- Execute read-only in the target database. This is not a migration.
-- No tenant IDs or member rows are selected into the output.
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
      '20261018183000', -- P0-E seat suspension
      '20261018190000'  -- P0-F atomic usage reconciliation
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
        position('public.organization_usage' in
          pg_get_functiondef(to_regprocedure('public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)'))
        ) > 0 and position('last_reconciled_at' in
          pg_get_functiondef(to_regprocedure('public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)'))
        ) > 0, false
      ) as removal_usage_reconciled,
      coalesce(
        position('public.organization_usage' in
          pg_get_functiondef(to_regprocedure('public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)'))
        ) > 0 and position('last_reconciled_at' in
          pg_get_functiondef(to_regprocedure('public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)'))
        ) > 0, false
      ) as role_usage_reconciled,
      coalesce(
        position('v_active_owner_count' in
          pg_get_functiondef(to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)'))
        ) > 0 and position('last_owner' in
          pg_get_functiondef(to_regprocedure('public.release_organization_seat_atomic(uuid,uuid,uuid,text,text)'))
        ) > 0, false
      ) as owner_suspension
  ),
  -- Direct service_role access to legacy membership mutations must be
  -- retired AFTER the audited entrypoints are deployed and exercised.
  -- The six migrations alone do not prove this manual cutover happened.
  rpc_id_gate as (
    select
      to_regprocedure('public.remove_organization_member_atomic(uuid,uuid,uuid,text)') as legacy_removal,
      to_regprocedure('public.change_organization_member_role_atomic(uuid,uuid,text,text)') as legacy_role,
      to_regprocedure('public.remove_organization_member_audited_atomic(uuid,uuid,uuid,text,uuid,uuid,timestamptz,text,text,text,jsonb)') as audited_removal,
      to_regprocedure('public.change_organization_member_role_audited_atomic(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,text,text,text,jsonb)') as audited_role
  ),
  rpc_cutover_gate as (
    select
      coalesce(legacy_removal is not null
        and not has_function_privilege('service_role', legacy_removal, 'EXECUTE'),false)
        as legacy_removal_retired,
      coalesce(legacy_role is not null
        and not has_function_privilege('service_role', legacy_role, 'EXECUTE'),false)
        as legacy_role_retired,
      coalesce(audited_removal is not null
        and has_function_privilege('service_role', audited_removal, 'EXECUTE')
        and not has_function_privilege('anon', audited_removal, 'EXECUTE')
        and not has_function_privilege('authenticated', audited_removal, 'EXECUTE'),false)
        as audited_removal_service_only,
      coalesce(audited_role is not null
        and has_function_privilege('service_role', audited_role, 'EXECUTE')
        and not has_function_privilege('anon', audited_role, 'EXECUTE')
        and not has_function_privilege('authenticated', audited_role, 'EXECUTE'),false)
        as audited_role_service_only
    from rpc_id_gate
  ),
  membership_totals as (
    select organization_id,
      count(*) filter (where status = 'active')::integer as active_members,
      count(*) filter (where status = 'active' and seat_type = 'full')::integer as full_users,
      count(*) filter (where status = 'active' and seat_type = 'participant')::integer as participants,
      count(*) filter (where status = 'active' and seat_type = 'viewer')::integer as viewers,
      count(*) filter (where status = 'active' and lower(coalesce(role, '')) in ('owner','admin'))::integer as active_admins
    from public.organization_members
    group by organization_id
  ),
  usage_gate as (
    select count(*)::integer as usage_organizations_checked,
      count(*) filter (where
        usage.active_members is distinct from coalesce(actual.active_members,0)
        or usage.full_users is distinct from coalesce(actual.full_users,0)
        or usage.participants is distinct from coalesce(actual.participants,0)
        or usage.viewers is distinct from coalesce(actual.viewers,0)
        or usage.active_admins is distinct from coalesce(actual.active_admins,0)
      )::integer as drifted_usage_organizations,
      (select count(*)::integer
       from membership_totals as missing
       left join public.organization_usage as existing
         on existing.organization_id = missing.organization_id
       where existing.organization_id is null
      ) as organizations_missing_usage
    from public.organization_usage as usage
    left join membership_totals as actual
      on actual.organization_id = usage.organization_id
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
  6 as required_migration_count,
  f.mfa_read, f.mfa_manage, f.owner_removal,
  f.removal_audited, f.role_audited, f.removal_usage_reconciled, f.role_usage_reconciled,
  f.owner_suspension,
  x.legacy_removal_retired, x.legacy_role_retired,
  x.audited_removal_service_only, x.audited_role_service_only,
  u.usage_organizations_checked, u.drifted_usage_organizations, u.organizations_missing_usage,
  r.public_tables, r.public_rls_force,
  a.public_definer_exposed,
  case when m.applied_count=6
    and f.mfa_read and f.mfa_manage and f.owner_removal
    and f.removal_audited and f.role_audited
    and f.removal_usage_reconciled and f.role_usage_reconciled
    and f.owner_suspension
    and x.legacy_removal_retired and x.legacy_role_retired
    and x.audited_removal_service_only and x.audited_role_service_only
    and u.drifted_usage_organizations=0
    and u.organizations_missing_usage=0
    and r.public_tables = r.public_rls_force
    and a.public_definer_exposed = 0
  then 'SCHEMA_CANDIDATE_REQUIRES_RUNTIME_ACCEPTANCE'
  else 'BLOCKED_SOURCE_DB_DRIFT'
  end as schema_admission
from migration_gate m cross join function_gate f cross join rpc_cutover_gate x cross join usage_gate u cross join rls_gate r cross join acl_gate a;
