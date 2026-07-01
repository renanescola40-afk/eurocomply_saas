-- Self-contained RLS hardening for onboarding activation runs.
-- The prior helper call depended on a temporary function from an earlier migration,
-- which had already been dropped. Keep this migration independently replayable.

do $$
begin
  if to_regclass('public.onboarding_activation_runs') is null then
    return;
  end if;

  alter table public.onboarding_activation_runs enable row level security;
  alter table public.onboarding_activation_runs force row level security;

  drop policy if exists "Members can read onboarding activation runs" on public.onboarding_activation_runs;
  drop policy if exists "Managers can create onboarding activation runs" on public.onboarding_activation_runs;
  drop policy if exists "Managers can update onboarding activation runs" on public.onboarding_activation_runs;
  drop policy if exists "Managers can delete onboarding activation runs" on public.onboarding_activation_runs;
  drop policy if exists "rls_onboarding_activation_runs_select_member" on public.onboarding_activation_runs;
  drop policy if exists "rls_onboarding_activation_runs_insert_writer" on public.onboarding_activation_runs;
  drop policy if exists "rls_onboarding_activation_runs_update_writer" on public.onboarding_activation_runs;
  drop policy if exists "rls_onboarding_activation_runs_delete_admin" on public.onboarding_activation_runs;

  create policy "rls_onboarding_activation_runs_select_member"
    on public.onboarding_activation_runs
    for select
    to authenticated
    using (public.is_org_member(organization_id));

  create policy "rls_onboarding_activation_runs_insert_writer"
    on public.onboarding_activation_runs
    for insert
    to authenticated
    with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

  create policy "rls_onboarding_activation_runs_update_writer"
    on public.onboarding_activation_runs
    for update
    to authenticated
    using (public.has_org_role(organization_id, array['owner','admin','compliance_manager']))
    with check (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));

  create policy "rls_onboarding_activation_runs_delete_admin"
    on public.onboarding_activation_runs
    for delete
    to authenticated
    using (public.has_org_role(organization_id, array['owner','admin']));
end $$;
