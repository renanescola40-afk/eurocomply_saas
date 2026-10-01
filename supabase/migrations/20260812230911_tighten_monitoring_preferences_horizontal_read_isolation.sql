begin;

-- Historical clean-replay compatibility: the monitoring_preferences creator is
-- not guaranteed to exist in the production migration ledger. When the table
-- exists, retain the self/admin policy and fail-closed verification unchanged.
do $monitoring_preferences_policy_apply$
begin
  if to_regclass('public.monitoring_preferences') is not null then
    execute 'alter table public.monitoring_preferences enable row level security';
    execute 'alter table public.monitoring_preferences force row level security';

    execute 'drop policy if exists rls_monitoring_preferences_select_member_or_owner on public.monitoring_preferences';
    execute 'drop policy if exists rls_monitoring_preferences_select_self_or_admin on public.monitoring_preferences';

    execute $policy$
      create policy rls_monitoring_preferences_select_self_or_admin
        on public.monitoring_preferences
        for select
        to authenticated
        using (
          app_private.is_org_member(organization_id)
          and (
            current_app_user_matches(user_id)
            or app_private.has_org_role(organization_id, array['owner','admin']::text[])
          )
        )
    $policy$;
  end if;
end
$monitoring_preferences_policy_apply$;

do $monitoring_preferences_policy_guard$
begin
  if to_regclass('public.monitoring_preferences') is not null then
    if exists (
      select 1 from pg_policies
      where schemaname='public'
        and tablename='monitoring_preferences'
        and policyname='rls_monitoring_preferences_select_member_or_owner'
    ) then
      raise exception 'legacy member-wide monitoring preferences SELECT policy survived';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname='public'
        and tablename='monitoring_preferences'
        and policyname='rls_monitoring_preferences_select_self_or_admin'
        and cmd='SELECT'
        and roles = array['authenticated']::name[]
    ) then
      raise exception 'self/admin monitoring preferences SELECT policy missing';
    end if;
  end if;
end
$monitoring_preferences_policy_guard$;

commit;
