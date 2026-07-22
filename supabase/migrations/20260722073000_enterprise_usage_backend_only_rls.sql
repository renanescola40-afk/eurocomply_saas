-- Explicitly fail closed for authenticated clients on the backend-owned
-- organization_usage aggregate. Service-role RPCs retain access because the
-- service role bypasses RLS and has explicit table grants.

begin;

alter table public.organization_usage enable row level security;
alter table public.organization_usage force row level security;

revoke all on table public.organization_usage from public, anon, authenticated;
grant select, insert, update on table public.organization_usage to service_role;

drop policy if exists rls_organization_usage_select_backend_only on public.organization_usage;
drop policy if exists rls_organization_usage_insert_backend_only on public.organization_usage;
drop policy if exists rls_organization_usage_update_backend_only on public.organization_usage;
drop policy if exists rls_organization_usage_delete_backend_only on public.organization_usage;

create policy rls_organization_usage_select_backend_only
  on public.organization_usage
  for select
  to authenticated
  using (false);

create policy rls_organization_usage_insert_backend_only
  on public.organization_usage
  for insert
  to authenticated
  with check (false);

create policy rls_organization_usage_update_backend_only
  on public.organization_usage
  for update
  to authenticated
  using (false)
  with check (false);

create policy rls_organization_usage_delete_backend_only
  on public.organization_usage
  for delete
  to authenticated
  using (false);

notify pgrst, 'reload schema';

commit;
