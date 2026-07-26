begin;

-- The access operations control plane is backend-only. These explicit
-- authenticated-role policies document and enforce the fail-closed boundary
-- required by the repository RLS coverage gate. service_role bypasses RLS and
-- remains the only runtime principal with table access.

create policy enterprise_access_operations_authenticated_select_deny
  on public.enterprise_access_operations
  for select
  to authenticated
  using (false);

create policy enterprise_access_operations_authenticated_insert_deny
  on public.enterprise_access_operations
  for insert
  to authenticated
  with check (false);

create policy enterprise_access_operations_authenticated_update_deny
  on public.enterprise_access_operations
  for update
  to authenticated
  using (false)
  with check (false);

create policy enterprise_access_operations_authenticated_delete_deny
  on public.enterprise_access_operations
  for delete
  to authenticated
  using (false);

create policy enterprise_access_operation_items_authenticated_select_deny
  on public.enterprise_access_operation_items
  for select
  to authenticated
  using (false);

create policy enterprise_access_operation_items_authenticated_insert_deny
  on public.enterprise_access_operation_items
  for insert
  to authenticated
  with check (false);

create policy enterprise_access_operation_items_authenticated_update_deny
  on public.enterprise_access_operation_items
  for update
  to authenticated
  using (false)
  with check (false);

create policy enterprise_access_operation_items_authenticated_delete_deny
  on public.enterprise_access_operation_items
  for delete
  to authenticated
  using (false);

create policy enterprise_access_operation_events_authenticated_select_deny
  on public.enterprise_access_operation_events
  for select
  to authenticated
  using (false);

create policy enterprise_access_operation_events_authenticated_insert_deny
  on public.enterprise_access_operation_events
  for insert
  to authenticated
  with check (false);

create policy enterprise_access_operation_events_authenticated_update_deny
  on public.enterprise_access_operation_events
  for update
  to authenticated
  using (false)
  with check (false);

create policy enterprise_access_operation_events_authenticated_delete_deny
  on public.enterprise_access_operation_events
  for delete
  to authenticated
  using (false);

commit;
