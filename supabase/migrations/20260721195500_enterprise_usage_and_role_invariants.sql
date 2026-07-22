-- Keep organization usage derived from real membership state and enforce the
-- administrator quota on role transitions, including concurrent promotions.

begin;

create or replace function public.sync_organization_member_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := coalesce(new.organization_id, old.organization_id);
  v_usage public.organization_usage%rowtype;
begin
  if v_organization_id is null then
    return coalesce(new, old);
  end if;

  insert into public.organization_usage (organization_id)
  values (v_organization_id)
  on conflict (organization_id) do nothing;

  select
    count(*) filter (where member.status = 'active')::integer,
    count(*) filter (where member.status = 'active' and member.seat_type = 'full')::integer,
    count(*) filter (where member.status = 'active' and member.seat_type = 'participant')::integer,
    count(*) filter (where member.status = 'active' and member.seat_type = 'viewer')::integer,
    count(*) filter (
      where member.status = 'active'
        and lower(coalesce(member.role, '')) in ('owner', 'admin')
    )::integer
  into
    v_usage.active_members,
    v_usage.full_users,
    v_usage.participants,
    v_usage.viewers,
    v_usage.active_admins
  from public.organization_members as member
  where member.organization_id = v_organization_id;

  update public.organization_usage as usage
  set
    active_members = v_usage.active_members,
    full_users = v_usage.full_users,
    participants = v_usage.participants,
    viewers = v_usage.viewers,
    active_admins = v_usage.active_admins,
    last_reconciled_at = now(),
    updated_at = now()
  where usage.organization_id = v_organization_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists organization_members_sync_usage on public.organization_members;
create trigger organization_members_sync_usage
after insert or update of role, seat_type, status or delete
on public.organization_members
for each row execute function public.sync_organization_member_usage();

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
  v_member public.organization_members%rowtype;
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_next_role text := lower(trim(coalesce(p_next_role, '')));
  v_expected_role text := lower(trim(coalesce(p_expected_role, '')));
  v_owner_count integer;
  v_active_admins integer;
  v_pending_admins integer;
  v_admin_limit integer;
begin
  if p_organization_id is null or p_member_id is null then
    return query select 'invalid_input'::text, null::uuid, null::uuid, null::text, null::text;
    return;
  end if;

  if v_next_role not in ('owner', 'admin', 'editor', 'member', 'viewer') then
    return query select 'invalid_role'::text, p_member_id, null::uuid, null::text, null::text;
    return;
  end if;

  insert into public.organization_usage (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  perform 1
  from public.organization_usage as usage
  where usage.organization_id = p_organization_id
  for update;

  select member.* into v_member
  from public.organization_members as member
  where member.id = p_member_id
    and member.organization_id = p_organization_id
  for update;

  if not found then
    return query select 'not_found'::text, p_member_id, null::uuid, null::text, null::text;
    return;
  end if;

  if lower(coalesce(v_member.role, '')) is distinct from v_expected_role then
    return query select 'state_changed'::text, p_member_id, v_member.user_id, v_member.role, null::text;
    return;
  end if;

  if lower(coalesce(v_member.role, 'viewer')) = v_next_role then
    return query select 'unchanged'::text, p_member_id, v_member.user_id, v_member.role, v_member.role;
    return;
  end if;

  if lower(coalesce(v_member.role, '')) = 'owner' and v_next_role <> 'owner' then
    select count(*)::integer into v_owner_count
    from public.organization_members as member
    where member.organization_id = p_organization_id
      and member.status = 'active'
      and lower(coalesce(member.role, '')) = 'owner';

    if v_owner_count <= 1 then
      return query select 'last_owner'::text, p_member_id, v_member.user_id, v_member.role, null::text;
      return;
    end if;
  end if;

  if v_next_role in ('owner', 'admin')
    and lower(coalesce(v_member.role, '')) not in ('owner', 'admin') then
    select contract.* into v_contract
    from public.enterprise_contracts as contract
    where contract.organization_id = p_organization_id
      and contract.status in (
        'draft', 'pending_activation', 'active', 'past_due', 'grace_period',
        'read_only', 'suspended'
      )
    order by contract.version desc, contract.updated_at desc
    limit 1
    for update;

    if not found or v_contract.status <> 'active' then
      return query select 'contract_not_active'::text, p_member_id, v_member.user_id, v_member.role, null::text;
      return;
    end if;

    select entitlement.* into v_entitlement
    from public.organization_entitlements as entitlement
    where entitlement.organization_id = p_organization_id
      and entitlement.contract_id = v_contract.id
    for update;

    if not found then
      return query select 'entitlements_missing'::text, p_member_id, v_member.user_id, v_member.role, null::text;
      return;
    end if;

    select count(*)::integer into v_active_admins
    from public.organization_members as member
    where member.organization_id = p_organization_id
      and member.status = 'active'
      and lower(coalesce(member.role, '')) in ('owner', 'admin');

    select count(*)::integer into v_pending_admins
    from public.invitations as invitation
    where invitation.organization_id = p_organization_id
      and invitation.accepted_at is null
      and invitation.revoked_at is null
      and invitation.expires_at > now()
      and lower(coalesce(invitation.role, '')) in ('owner', 'admin');

    v_admin_limit := least(v_contract.admin_limit, v_entitlement.admin_limit);

    if v_active_admins + v_pending_admins >= v_admin_limit then
      return query select 'admin_limit_reached'::text, p_member_id, v_member.user_id, v_member.role, null::text;
      return;
    end if;
  end if;

  update public.organization_members as member
  set role = v_next_role,
      updated_at = now()
  where member.id = p_member_id
    and member.organization_id = p_organization_id
    and lower(coalesce(member.role, '')) = v_expected_role;

  if not found then
    return query select 'state_changed'::text, p_member_id, v_member.user_id, v_member.role, null::text;
    return;
  end if;

  return query select 'changed'::text, p_member_id, v_member.user_id, v_member.role, v_next_role;
end;
$$;

revoke all on function public.sync_organization_member_usage() from public, anon, authenticated;
revoke all on function public.change_organization_member_role_atomic(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.change_organization_member_role_atomic(uuid, uuid, text, text) to service_role;

notify pgrst, 'reload schema';

commit;
