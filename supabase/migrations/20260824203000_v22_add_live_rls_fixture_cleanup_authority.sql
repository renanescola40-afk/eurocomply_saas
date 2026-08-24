begin;

-- V22 runtime-proof safety boundary.
-- The live RLS proof creates disposable organizations only after a governed
-- Production promotion. Several Enterprise licensing tables intentionally do
-- not grant DELETE to service_role, so cleanup must not broaden table grants.
-- This SECURITY DEFINER RPC is narrowly limited to proof-owned organizations
-- whose slug/name and creator Auth metadata all carry the exact proof marker.
create or replace function public.cleanup_live_rls_fixture_v22(
  p_organization_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_table text;
  v_removed integer := 0;
  v_requested integer := coalesce(cardinality(p_organization_ids), 0);
begin
  if v_requested < 1 or v_requested > 8 then
    raise exception 'live RLS cleanup requires between 1 and 8 organization ids';
  end if;

  if exists (
    select 1
    from unnest(p_organization_ids) requested(id)
    left join public.organizations organization on organization.id = requested.id
    left join auth.users creator on creator.id = organization.created_by
    where organization.id is null
       or organization.slug not like 'rls-v22-%'
       or organization.name not like 'RLS V22 %'
       or coalesce(creator.raw_user_meta_data ->> 'purpose', '') <> 'post-v22-live-rls-proof'
  ) then
    raise exception 'live RLS cleanup rejected a non-proof organization';
  end if;

  -- Fixed allowlist + fixed order. No caller-controlled table name reaches SQL.
  -- Delete ordinary tenant rows first, then commercial/licensing authority,
  -- membership/usage state, contracts and finally the proof organizations.
  foreach v_table in array array[
    'evidence_items',
    'ai_assessments',
    'notifications',
    'monitoring_preferences',
    'onboarding_activation_runs',
    'invitations',
    'audit_logs',
    'compliance_tasks',
    'documents',
    'risks',
    'vendors',
    'ai_systems',
    'subscriptions',
    'enterprise_entitlement_reconciliation_events',
    'enterprise_entitlement_snapshots',
    'enterprise_entitlement_sources',
    'organization_entitlements',
    'enterprise_seat_operations',
    'enterprise_seat_policies',
    'organization_usage',
    'organization_members',
    'enterprise_contracts'
  ]
  loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format(
        'delete from public.%I where organization_id = any ($1)',
        v_table
      ) using p_organization_ids;
    end if;
  end loop;

  delete from public.organizations organization
  where organization.id = any (p_organization_ids);
  get diagnostics v_removed = row_count;

  if v_removed <> v_requested then
    raise exception 'live RLS cleanup removed % organizations; expected %', v_removed, v_requested;
  end if;

  return v_removed;
end;
$$;

revoke all on function public.cleanup_live_rls_fixture_v22(uuid[]) from public, anon, authenticated;
grant execute on function public.cleanup_live_rls_fixture_v22(uuid[]) to service_role;

comment on function public.cleanup_live_rls_fixture_v22(uuid[]) is
  'Bounded service-role-only cleanup for post-V22 live RLS proof organizations. Rejects every organization outside the exact synthetic proof marker.';

do $verify$
declare
  v_rpc oid := to_regprocedure('public.cleanup_live_rls_fixture_v22(uuid[])');
begin
  if v_rpc is null then
    raise exception 'V22 live RLS cleanup RPC is missing';
  end if;

  if has_function_privilege('anon', v_rpc, 'EXECUTE')
     or has_function_privilege('authenticated', v_rpc, 'EXECUTE')
     or not has_function_privilege('service_role', v_rpc, 'EXECUTE') then
    raise exception 'V22 live RLS cleanup RPC privileges are not service-role-only';
  end if;

  if not exists (
    select 1
    from pg_proc function
    cross join lateral unnest(coalesce(function.proconfig, array[]::text[])) setting
    where function.oid = v_rpc
      and function.prosecdef
      and setting = 'search_path=pg_catalog'
  ) then
    raise exception 'V22 live RLS cleanup RPC security configuration is not fixed';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
