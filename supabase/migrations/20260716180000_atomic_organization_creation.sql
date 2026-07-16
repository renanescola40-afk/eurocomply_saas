-- P0 tenant-integrity hardening: create the tenant and its first owner in one
-- database transaction. The backend-only RPC prevents orphan organizations
-- when membership persistence fails after the tenant row was inserted.

create or replace function public.create_organization_with_owner_atomic(
  p_name text,
  p_slug text,
  p_user_id uuid
)
returns table (
  outcome text,
  organization_id uuid,
  organization_name text,
  organization_slug text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization public.organizations%rowtype;
  v_name text := trim(coalesce(p_name, ''));
  v_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if p_user_id is null
    or char_length(v_name) < 2
    or char_length(v_name) > 120
    or char_length(v_slug) < 3
    or char_length(v_slug) > 80
    or v_slug !~ '^[a-z0-9-]+$' then
    return query select
      'invalid_input'::text,
      null::uuid,
      null::text,
      null::text,
      null::uuid,
      null::timestamptz,
      null::timestamptz;
    return;
  end if;

  insert into public.organizations (name, slug, created_by)
  values (v_name, v_slug, p_user_id)
  returning * into v_organization;

  -- If this insert fails, PostgreSQL rolls back the organization insert above
  -- together with this RPC statement. No tenant can exist without its owner.
  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization.id, p_user_id, 'owner');

  return query select
    'created'::text,
    v_organization.id,
    v_organization.name,
    v_organization.slug,
    v_organization.created_by,
    v_organization.created_at,
    v_organization.updated_at;
end;
$$;

revoke all on function public.create_organization_with_owner_atomic(text, text, uuid) from public;
revoke all on function public.create_organization_with_owner_atomic(text, text, uuid) from anon;
revoke all on function public.create_organization_with_owner_atomic(text, text, uuid) from authenticated;
grant execute on function public.create_organization_with_owner_atomic(text, text, uuid) to service_role;

notify pgrst, 'reload schema';
