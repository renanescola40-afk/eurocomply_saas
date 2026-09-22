-- Follow-up policy hardening applied to production.
-- Keep backend-only access explicit with role-bound service policies.

drop policy if exists "email delivery logs service role select" on public.email_delivery_logs;
drop policy if exists "email delivery logs service role insert" on public.email_delivery_logs;
drop policy if exists "email delivery logs service role update" on public.email_delivery_logs;
drop policy if exists "email delivery logs service role delete" on public.email_delivery_logs;

create policy "email delivery logs service role select"
  on public.email_delivery_logs
  for select
  to service_role
  using (current_user = 'service_role');

create policy "email delivery logs service role insert"
  on public.email_delivery_logs
  for insert
  to service_role
  with check (current_user = 'service_role');

create policy "email delivery logs service role update"
  on public.email_delivery_logs
  for update
  to service_role
  using (current_user = 'service_role')
  with check (current_user = 'service_role');

create policy "email delivery logs service role delete"
  on public.email_delivery_logs
  for delete
  to service_role
  using (current_user = 'service_role');
