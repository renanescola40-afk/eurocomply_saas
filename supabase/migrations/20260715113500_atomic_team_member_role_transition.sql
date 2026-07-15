-- P1 hardening: serialize organization membership role changes and prevent
-- concurrent demotion of the final owner.
--
-- This RPC is backend-only. The Next.js route performs authentication, RBAC,
-- trusted-mutation, rate-limit and step-up checks before invoking it with the
-- service-role client. The database function owns the final atomic transition.

create or replace function public.change_organization_member_role_atomic(
  p_organization_id uuid,
  p_member_id uuid,
  p_expected_role text,
  p_next_role text
)
returns table (
  outcome text,
  affected_member_id uuid,
  affected_user_id uuid,
  previous_role text,
  applied_role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_previous_role text;
  v_next_role text;
  v_owner_count integer;
begin
  if p_organization_id is null or p_member_id is null then
    return query select
      'invalid_input'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text;
    return;
  end if;

  v_next_role := lower(trim(coalesce(p_next_role, '')));
  if v_next_role not in ('owner', 'admin', 'editor', 'member', 'viewer') then
    return query select
      'invalid_role'::text,
      p_member_id,
      null::uuid,
      null::text,
      null::text;
    return;
  end if;

  -- Lock every membership row for this organization in a stable order. This
  -- serializes owner-count decisions and role transitions for the tenant.
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
      null::text,
      null::text;
    return;
  end if;

  if v_previous_role is distinct from p_expected_role then
    return query select
      'state_changed'::text,
      p_member_id,
      v_user_id,
      v_previous_role,
      null::text;
    return;
  end if;

  if lower(coalesce(v_previous_role, 'viewer')) = v_next_role then
    return query select
      'unchanged'::text,
      p_member_id,
      v_user_id,
      v_previous_role,
      v_previous_role;
    return;
  end if;

  if lower(coalesce(v_previous_role, '')) = 'owner' and v_next_role <> 'owner' then
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
        v_previous_role,
        null::text;
      return;
    end if;
  end if;

  update public.organization_members as om
  set role = v_next_role
  where om.id = p_member_id
    and om.organization_id = p_organization_id
    and om.role is not distinct from p_expected_role;

  if not found then
    return query select
      'state_changed'::text,
      p_member_id,
      v_user_id,
      v_previous_role,
      null::text;
    return;
  end if;

  return query select
    'changed'::text,
    p_member_id,
    v_user_id,
    v_previous_role,
    v_next_role;
end;
$$;

revoke all on function public.change_organization_member_role_atomic(uuid, uuid, text, text) from public;
revoke all on function public.change_organization_member_role_atomic(uuid, uuid, text, text) from anon;
revoke all on function public.change_organization_member_role_atomic(uuid, uuid, text, text) from authenticated;
grant execute on function public.change_organization_member_role_atomic(uuid, uuid, text, text) to service_role;

notify pgrst, 'reload schema';
