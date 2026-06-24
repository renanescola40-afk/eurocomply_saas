-- Minimal policy patch for the live Supabase RLS proof.

alter table public.audit_events enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;

drop policy if exists live_rls_audit_events_select_member on public.audit_events;
create policy live_rls_audit_events_select_member on public.audit_events
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = audit_events.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists live_rls_notifications_select_member on public.notifications;
create policy live_rls_notifications_select_member on public.notifications
  for select to authenticated
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = notifications.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists live_rls_tasks_select_member on public.tasks;
drop policy if exists live_rls_tasks_insert_member on public.tasks;
drop policy if exists live_rls_tasks_update_member on public.tasks;
drop policy if exists live_rls_tasks_delete_member on public.tasks;

create policy live_rls_tasks_select_member on public.tasks
  for select to authenticated
  using (exists (select 1 from public.organization_members om where om.organization_id = tasks.organization_id and om.user_id = auth.uid()));
create policy live_rls_tasks_insert_member on public.tasks
  for insert to authenticated
  with check (exists (select 1 from public.organization_members om where om.organization_id = tasks.organization_id and om.user_id = auth.uid()));
create policy live_rls_tasks_update_member on public.tasks
  for update to authenticated
  using (exists (select 1 from public.organization_members om where om.organization_id = tasks.organization_id and om.user_id = auth.uid()))
  with check (exists (select 1 from public.organization_members om where om.organization_id = tasks.organization_id and om.user_id = auth.uid()));
create policy live_rls_tasks_delete_member on public.tasks
  for delete to authenticated
  using (exists (select 1 from public.organization_members om where om.organization_id = tasks.organization_id and om.user_id = auth.uid()));

notify pgrst, 'reload schema';
