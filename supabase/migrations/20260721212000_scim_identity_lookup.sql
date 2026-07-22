begin;

create or replace function public.find_enterprise_scim_identity(
  p_organization_id uuid,
  p_external_id text,
  p_email text
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
    and (
      (nullif(trim(coalesce(p_external_id, '')), '') is not null
        and identity.external_id = trim(p_external_id))
      or identity.email = lower(trim(coalesce(p_email, '')))
    )
  order by
    case when identity.external_id = nullif(trim(coalesce(p_external_id, '')), '') then 0 else 1 end,
    identity.created_at
  limit 1;
$$;

revoke all on function public.find_enterprise_scim_identity(uuid, text, text) from public, anon, authenticated;
grant execute on function public.find_enterprise_scim_identity(uuid, text, text) to service_role;

notify pgrst, 'reload schema';

commit;
