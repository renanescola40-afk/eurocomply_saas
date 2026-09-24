create or replace function app_private.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select target_organization_id is not null
    and public.tenant_mfa_satisfied(target_organization_id)
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and lower(coalesce(om.status, '')) = 'active'
        and (
          (
            public.current_legacy_user_id() is not null
            and om.user_id = public.current_legacy_user_id()
          )
          or (
            public.current_clerk_user_id() is not null
            and om.clerk_user_id = public.current_clerk_user_id()
          )
        )
    );
$$;

create or replace function app_private.has_org_role(target_organization_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select target_organization_id is not null
    and public.tenant_mfa_satisfied(target_organization_id)
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and lower(coalesce(om.status, '')) = 'active'
        and lower(om.role) = any(allowed_roles)
        and (
          (
            public.current_legacy_user_id() is not null
            and om.user_id = public.current_legacy_user_id()
          )
          or (
            public.current_clerk_user_id() is not null
            and om.clerk_user_id = public.current_clerk_user_id()
          )
        )
    );
$$;
