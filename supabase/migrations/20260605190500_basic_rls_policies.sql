create policy "Users can view own profile"
on public.profiles for select
using (id = auth.uid());

create policy "Users can update own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "Members can view organizations"
on public.organizations for select
using (
  id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
  )
);

create policy "Members can view memberships"
on public.organization_members for select
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
  )
);

create policy "Members can view subscriptions"
on public.subscriptions for select
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
  )
);

create policy "Members can view audit logs"
on public.audit_logs for select
using (
  organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
  )
);
