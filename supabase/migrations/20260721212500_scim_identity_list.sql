begin;

create or replace function public.list_enterprise_scim_identities(
  p_organization_id uuid,
  p_start_index integer default 1,
  p_count integer default 100,
  p_email_filter text default null
)
returns table (
  identity_id uuid,
  external_id text,
  user_id uuid,
  membership_id uuid,
  email text,
  role text,
  seat_type text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  total_results bigint
)
language sql
security definer
set search_path = public
as $$
  with filtered as (
    select
      identity.id,
      identity.external_id,
      identity.user_id,
      member.id as membership_id,
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
        nullif(lower(trim(coalesce(p_email_filter, ''))), '') is null
        or identity.email = lower(trim(p_email_filter))
      )
  )
  select
    filtered.id,
    filtered.external_id,
    filtered.user_id,
    filtered.membership_id,
    filtered.email,
    filtered.role,
    filtered.seat_type,
    filtered.active,
    filtered.created_at,
    filtered.updated_at,
    count(*) over ()
  from filtered
  order by filtered.created_at, filtered.id
  offset greatest(coalesce(p_start_index, 1) - 1, 0)
  limit least(greatest(coalesce(p_count, 100), 1), 200);
$$;

revoke all on function public.list_enterprise_scim_identities(uuid, integer, integer, text) from public, anon, authenticated;
grant execute on function public.list_enterprise_scim_identities(uuid, integer, integer, text) to service_role;

notify pgrst, 'reload schema';

commit;
