begin;

drop function if exists public.get_enterprise_scim_identity(uuid, uuid);

create function public.get_enterprise_scim_identity(
  p_organization_id uuid,
  p_identity_id uuid
)
returns table (
  outcome text,
  identity_id uuid,
  external_id text,
  user_id uuid,
  membership_id uuid,
  email text,
  role text,
  seat_type text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    'resolved'::text,
    identity.id,
    identity.external_id,
    identity.user_id,
    member.id,
    identity.email,
    identity.role,
    identity.seat_type,
    identity.active,
    identity.created_at,
    identity.updated_at
  from public.enterprise_scim_identities as identity
  left join public.organization_members as member
    on member.organization_id = identity.organization_id
    and member.user_id = identity.user_id
  where identity.organization_id = p_organization_id
    and identity.id = p_identity_id;
$$;

revoke all on function public.get_enterprise_scim_identity(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_enterprise_scim_identity(uuid, uuid) to service_role;

notify pgrst, 'reload schema';

commit;
