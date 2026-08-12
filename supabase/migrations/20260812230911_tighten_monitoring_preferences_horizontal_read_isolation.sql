begin;

alter table public.monitoring_preferences enable row level security;
alter table public.monitoring_preferences force row level security;

drop policy if exists rls_monitoring_preferences_select_member_or_owner on public.monitoring_preferences;
drop policy if exists rls_monitoring_preferences_select_self_or_admin on public.monitoring_preferences;

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
  );

do $$
begin
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
end $$;

commit;
