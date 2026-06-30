-- P0 fix: lock organization_members mutations behind backend-only writes.
--
-- Why:
-- organization_members is the privilege boundary for every tenant. Allowing
-- direct authenticated INSERT/UPDATE/DELETE policies on this table is risky,
-- because a viewer attempting to change membership rows can create privilege
-- escalation paths. Membership mutations must go through trusted server-side
-- routes/RPCs that perform RBAC, step-up, audit logging and use privileged
-- backend credentials.
--
-- This migration intentionally keeps tenant member reads available while making
-- all authenticated client-side writes fail closed.

create extension if not exists pgcrypto;

-- Keep helpers explicit and stable for tenant reads.
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
        and lower(om.role) = any(select lower(role_name) from unnest(allowed_roles) as role_name)
    );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

do $$
begin
  if to_regclass('public.organization_members') is null then
    return;
  end if;

  alter table public.organization_members enable row level security;

  -- Remove all known legacy/permissive policies that could still make direct
  -- client-side membership writes possible.
  drop policy if exists "Members can view memberships" on public.organization_members;
  drop policy if exists "Members can manage memberships" on public.organization_members;
  drop policy if exists "Users can view memberships" on public.organization_members;
  drop policy if exists "Users can manage memberships" on public.organization_members;
  drop policy if exists "Organization members can view memberships" on public.organization_members;
  drop policy if exists "Organization members can manage memberships" on public.organization_members;
  drop policy if exists "Owners can manage memberships" on public.organization_members;
  drop policy if exists "Admins can manage memberships" on public.organization_members;

  drop policy if exists "rls_organization_members_select_member" on public.organization_members;
  drop policy if exists "rls_organization_members_insert_admin" on public.organization_members;
  drop policy if exists "rls_organization_members_update_admin" on public.organization_members;
  drop policy if exists "rls_organization_members_delete_admin" on public.organization_members;
  drop policy if exists "rls_organization_members_insert_backend_only" on public.organization_members;
  drop policy if exists "rls_organization_members_update_backend_only" on public.organization_members;
  drop policy if exists "rls_organization_members_delete_backend_only" on public.organization_members;

  -- Tenant members may list membership rows for their own organization.
  create policy "rls_organization_members_select_member"
    on public.organization_members
    for select
    to authenticated
    using (public.is_org_member(organization_id));

  -- Membership writes are backend-only. Trusted Next.js API routes should use
  -- server-side RBAC/step-up/audit controls plus service-role credentials.
  create policy "rls_organization_members_insert_backend_only"
    on public.organization_members
    for insert
    to authenticated
    with check (false);

  create policy "rls_organization_members_update_backend_only"
    on public.organization_members
    for update
    to authenticated
    using (false)
    with check (false);

  create policy "rls_organization_members_delete_backend_only"
    on public.organization_members
    for delete
    to authenticated
    using (false);
end $$;

notify pgrst, 'reload schema';
