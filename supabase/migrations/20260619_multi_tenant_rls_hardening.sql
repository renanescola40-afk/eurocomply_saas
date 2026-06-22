-- P0 multi-tenant RLS hardening for EuroComply.
-- Focused migration: install tenant helpers and remove known legacy permissive policies.

create extension if not exists pgcrypto;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null
    and target_organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and om.user_id = auth.uid()
    );
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null
    and target_organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and om.user_id = auth.uid()
        and lower(om.role) = any(allowed_roles)
    );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

-- Remove legacy policies that can keep recursive or permissive behavior alive.
drop policy if exists "Members can view memberships" on public.organization_members;
drop policy if exists "Owners can manage subscriptions" on public.subscriptions;

alter table if exists public.organization_members enable row level security;
drop policy if exists "rls_organization_members_select_member" on public.organization_members;
drop policy if exists "rls_organization_members_insert_admin" on public.organization_members;
drop policy if exists "rls_organization_members_update_admin" on public.organization_members;
drop policy if exists "rls_organization_members_delete_admin" on public.organization_members;
create policy "rls_organization_members_select_member" on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
create policy "rls_organization_members_insert_admin" on public.organization_members for insert to authenticated with check (public.has_org_role(organization_id, array['owner','admin']));
create policy "rls_organization_members_update_admin" on public.organization_members for update to authenticated using (public.has_org_role(organization_id, array['owner','admin'])) with check (public.has_org_role(organization_id, array['owner','admin']));
create policy "rls_organization_members_delete_admin" on public.organization_members for delete to authenticated using (public.has_org_role(organization_id, array['owner','admin']));

alter table if exists public.subscriptions enable row level security;
drop policy if exists "rls_subscriptions_select_member" on public.subscriptions;
drop policy if exists "rls_subscriptions_insert_backend_only" on public.subscriptions;
drop policy if exists "rls_subscriptions_update_backend_only" on public.subscriptions;
drop policy if exists "rls_subscriptions_delete_backend_only" on public.subscriptions;
create policy "rls_subscriptions_select_member" on public.subscriptions for select to authenticated using (public.is_org_member(organization_id));
create policy "rls_subscriptions_insert_backend_only" on public.subscriptions for insert to authenticated with check (false);
create policy "rls_subscriptions_update_backend_only" on public.subscriptions for update to authenticated using (false) with check (false);
create policy "rls_subscriptions_delete_backend_only" on public.subscriptions for delete to authenticated using (false);
