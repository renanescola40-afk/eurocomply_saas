alter table public.organization_security_settings
  add column if not exists require_mfa_for_all_users boolean not null default false;

create or replace function public.tenant_mfa_satisfied(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    target_organization_id is not null
    and (
      coalesce((
        select not oss.require_mfa_for_all_users
        from public.organization_security_settings oss
        where oss.organization_id = target_organization_id
      ), true)
      or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    );
$$;

revoke all on function public.tenant_mfa_satisfied(uuid) from public;
grant execute on function public.tenant_mfa_satisfied(uuid) to authenticated, service_role;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null
    and target_organization_id is not null
    and public.tenant_mfa_satisfied(target_organization_id)
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and om.user_id = auth.uid()
        and coalesce(om.status, 'active') = 'active'
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
    and public.tenant_mfa_satisfied(target_organization_id)
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and om.user_id = auth.uid()
        and coalesce(om.status, 'active') = 'active'
        and lower(om.role) = any(allowed_roles)
    );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
