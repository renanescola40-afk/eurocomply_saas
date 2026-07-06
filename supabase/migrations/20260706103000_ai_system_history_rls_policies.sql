alter table public.ai_system_history enable row level security;

drop policy if exists ai_system_history_select_members on public.ai_system_history;
create policy ai_system_history_select_members
  on public.ai_system_history
  for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_system_history.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists ai_system_history_insert_members on public.ai_system_history;
create policy ai_system_history_insert_members
  on public.ai_system_history
  for insert
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = ai_system_history.organization_id
        and om.user_id = auth.uid()
    )
  );
