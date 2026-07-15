-- P1 hardening: serialize organization membership removals and prevent
-- concurrent deletion of the final owner.
--
-- This RPC is backend-only. The Next.js route performs authentication, RBAC,
-- trusted-mutation, rate-limit and step-up checks before invoking it with the
-- service-role client. The database function owns the final atomic removal.

create or replace function public.remove_organization_member_atomic(
  p_organization_id uuid,
  p_member_id uuid,
  p_expected_user_id uuid,
  p_expected_role text
)
returns table (
  outcome text,
  affected_member_id uuid,
  affected_user_id uuid,
  previous_role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_previous_role text;
  v_owner_count integer;
begin
  if p_organization_id is null or p_member_id is null or p_expected_user_id is null then
    return query select
      'invalid_input'::text,
      null::uuid,
      null::uuid,
      null::text;
    return;
  end if;

  -- Lock every membership row for this organization in a stable order. This
  -- serializes owner-count decisions, role transitions and removals for the tenant.
  perform 1
  from public.organization_members as om
  where om.organization_id = p_organization_id
  order by om.id
  for update;

  select om.user_id, om.role
    into v_user_id, v_previous_role
  from public.organization_members as om
  where om.id = p_member_id
    and om.organization_id = p_organization_id;

  if not found then
    return query select
      'not_found'::text,
      p_member_id,
      null::uuid,
      null::text;
    return;
  end if;

  if v_user_id is distinct from p_expected_user_id
    or v_previous_role is distinct from p_expected_role then
    return query select
      'state_changed'::text,
      p_member_id,
      v_user_id,
      v_previous_role;
    return;
  end if;

  if lower(coalesce(v_previous_role, '')) = 'owner' then
    select count(*)::integer
      into v_owner_count
    from public.organization_members as om
    where om.organization_id = p_organization_id
      and lower(coalesce(om.role, '')) = 'owner';

    if v_owner_count <= 1 then
      return query select
        'last_owner'::text,
        p_member_id,
        v_user_id,
        v_previous_role;
      return;
    end if;
  end if;

  delete from public.organization_members as om
  where om.id = p_member_id
    and om.organization_id = p_organization_id
    and om.user_id = p_expected_user_id
    and om.role is not distinct from p_expected_role;

  if not found then
    return query select
      'state_changed'::text,
      p_member_id,
      v_user_id,
      v_previous_role;
    return;
  end if;

  return query select
    'removed'::text,
    p_member_id,
    v_user_id,
    v_previous_role;
end;
$$;

revoke all on function public.remove_organization_member_atomic(uuid, uuid, uuid, text) from public;
revoke all on function public.remove_organization_member_atomic(uuid, uuid, uuid, text) from anon;
revoke all on function public.remove_organization_member_atomic(uuid, uuid, uuid, text) from authenticated;
grant execute on function public.remove_organization_member_atomic(uuid, uuid, uuid, text) to service_role;

notify pgrst, 'reload schema';
