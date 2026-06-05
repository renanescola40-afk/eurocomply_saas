create policy "Owners can update organizations"
on public.organizations
for update
using (public.has_org_role(id, array['owner']))
with check (public.has_org_role(id, array['owner']));

create policy "Admins can add members"
on public.organization_members
for insert
with check (public.has_org_role(organization_id, array['owner','admin']));

create policy "Admins can update members"
on public.organization_members
for update
using (public.has_org_role(organization_id, array['owner','admin']))
with check (public.has_org_role(organization_id, array['owner','admin']));

create policy "Admins can remove members"
on public.organization_members
for delete
using (public.has_org_role(organization_id, array['owner','admin']));

create policy "Owners can manage subscriptions"
on public.subscriptions
for all
using (public.has_org_role(organization_id, array['owner']))
with check (public.has_org_role(organization_id, array['owner']));
