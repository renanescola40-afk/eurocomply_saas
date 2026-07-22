-- Reserve Enterprise capacity when an invitation is created, and include
-- pending invitations in all non-invitation seat allocations. The final access
-- grant remains atomic at invitation acceptance.

begin;

create or replace function public.sync_organization_pending_invitation_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := coalesce(new.organization_id, old.organization_id);
begin
  if v_organization_id is null then
    return coalesce(new, old);
  end if;

  insert into public.organization_usage (organization_id)
  values (v_organization_id)
  on conflict (organization_id) do nothing;

  update public.organization_usage as usage
  set
    pending_invitations = (
      select count(*)::integer
      from public.invitations as invitation
      where invitation.organization_id = v_organization_id
        and invitation.accepted_at is null
        and invitation.revoked_at is null
        and invitation.expires_at > now()
    ),
    updated_at = now()
  where usage.organization_id = v_organization_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists invitations_sync_pending_usage on public.invitations;
create trigger invitations_sync_pending_usage
after insert or update of accepted_at, revoked_at, expires_at or delete
on public.invitations
for each row execute function public.sync_organization_pending_invitation_usage();

create or replace function public.reserve_organization_seat_with_pending_atomic(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text,
  p_seat_type text,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_source text default 'api'
)
returns table (
  outcome text,
  membership_id uuid,
  applied_role text,
  applied_seat_type text,
  active_members integer,
  seat_usage integer,
  seat_limit integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_usage public.organization_usage%rowtype;
  v_pending_members integer := 0;
  v_pending_seats integer := 0;
  v_pending_admins integer := 0;
  v_member_limit integer;
  v_seat_limit integer;
  v_admin_limit integer;
  v_role text := lower(trim(coalesce(p_role, '')));
  v_seat_type text := lower(trim(coalesce(p_seat_type, '')));
  v_source text := lower(trim(coalesce(p_source, '')));
  v_invitation_id uuid;
  v_result record;
begin
  if p_organization_id is null
    or p_user_id is null
    or p_actor_user_id is null
    or length(trim(coalesce(p_idempotency_key, ''))) not between 8 and 200 then
    return query select 'invalid_input'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;

  if v_role not in ('owner', 'admin', 'editor', 'member', 'viewer') then
    return query select 'invalid_role'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;

  if v_seat_type not in ('full', 'participant', 'viewer') then
    return query select 'invalid_seat_type'::text, null::uuid, null::text, null::text, 0, 0, 0;
    return;
  end if;

  if v_source = 'invitation'
    and p_idempotency_key ~ '^invitation:[0-9a-fA-F-]{36}$' then
    v_invitation_id := split_part(p_idempotency_key, ':', 2)::uuid;
  end if;

  insert into public.organization_usage (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  select usage.* into v_usage
  from public.organization_usage as usage
  where usage.organization_id = p_organization_id
  for update;

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

  if not found then
    return query select 'contract_missing'::text, null::uuid, null::text, v_seat_type, 0, 0, 0;
    return;
  end if;

  if v_contract.status <> 'active' then
    return query select 'contract_not_active'::text, null::uuid, null::text, v_seat_type, 0, 0, 0;
    return;
  end if;

  select entitlement.* into v_entitlement
  from public.organization_entitlements as entitlement
  where entitlement.organization_id = p_organization_id
    and entitlement.contract_id = v_contract.id
  for update;

  if not found then
    return query select 'entitlements_missing'::text, null::uuid, null::text, v_seat_type, 0, 0, 0;
    return;
  end if;

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
  where member.organization_id = p_organization_id;

  select
    count(*)::integer,
    count(*) filter (where invitation.seat_type = v_seat_type)::integer,
    count(*) filter (where lower(coalesce(invitation.role, '')) in ('owner', 'admin'))::integer
  into v_pending_members, v_pending_seats, v_pending_admins
  from public.invitations as invitation
  where invitation.organization_id = p_organization_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now()
    and (v_invitation_id is null or invitation.id <> v_invitation_id);

  v_member_limit := least(v_contract.member_limit, v_entitlement.member_limit);
  v_seat_limit := case v_seat_type
    when 'full' then least(v_contract.full_user_limit, v_entitlement.full_user_limit)
    when 'participant' then least(v_contract.participant_limit, v_entitlement.participant_limit)
    else least(v_contract.viewer_limit, v_entitlement.viewer_limit)
  end;
  v_admin_limit := least(v_contract.admin_limit, v_entitlement.admin_limit);

  if v_usage.active_members + v_pending_members >= v_member_limit then
    return query select
      'member_limit_reached'::text,
      null::uuid,
      null::text,
      v_seat_type,
      v_usage.active_members,
      case v_seat_type
        when 'full' then v_usage.full_users
        when 'participant' then v_usage.participants
        else v_usage.viewers
      end,
      v_seat_limit;
    return;
  end if;

  if (
    case v_seat_type
      when 'full' then v_usage.full_users
      when 'participant' then v_usage.participants
      else v_usage.viewers
    end
  ) + v_pending_seats >= v_seat_limit then
    return query select
      'seat_limit_reached'::text,
      null::uuid,
      null::text,
      v_seat_type,
      v_usage.active_members,
      case v_seat_type
        when 'full' then v_usage.full_users
        when 'participant' then v_usage.participants
        else v_usage.viewers
      end,
      v_seat_limit;
    return;
  end if;

  if v_role in ('owner', 'admin')
    and v_usage.active_admins + v_pending_admins >= v_admin_limit then
    return query select
      'admin_limit_reached'::text,
      null::uuid,
      null::text,
      v_seat_type,
      v_usage.active_members,
      v_usage.active_admins,
      v_admin_limit;
    return;
  end if;

  select * into v_result
  from public.reserve_organization_seat_atomic(
    p_organization_id,
    p_user_id,
    v_role,
    v_seat_type,
    p_actor_user_id,
    p_idempotency_key,
    v_source
  );

  return query select
    v_result.outcome,
    v_result.membership_id,
    v_result.applied_role,
    v_result.applied_seat_type,
    v_result.active_members,
    v_result.seat_usage,
    v_result.seat_limit;
end;
$$;

create or replace function public.create_organization_invitation_with_seat_atomic(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_seat_type text,
  p_token text,
  p_invited_by uuid,
  p_expires_at timestamptz
)
returns table (
  outcome text,
  invitation_id uuid,
  organization_id uuid,
  email text,
  applied_role text,
  applied_seat_type text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_usage public.organization_usage%rowtype;
  v_invitation public.invitations%rowtype;
  v_existing public.invitations%rowtype;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := lower(trim(coalesce(p_role, '')));
  v_seat_type text := lower(trim(coalesce(p_seat_type, '')));
  v_pending_members integer := 0;
  v_pending_seats integer := 0;
  v_pending_admins integer := 0;
  v_member_limit integer;
  v_seat_limit integer;
  v_admin_limit integer;
begin
  if p_organization_id is null
    or p_invited_by is null
    or v_email = ''
    or nullif(trim(coalesce(p_token, '')), '') is null
    or p_expires_at is null
    or p_expires_at <= now() then
    return query select 'invalid_input'::text, null::uuid, p_organization_id, null::text, null::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_role not in ('owner', 'admin', 'editor', 'member', 'viewer') then
    return query select 'invalid_role'::text, null::uuid, p_organization_id, v_email, null::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_seat_type not in ('full', 'participant', 'viewer') then
    return query select 'invalid_seat_type'::text, null::uuid, p_organization_id, v_email, v_role, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  insert into public.organization_usage (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  select usage.* into v_usage
  from public.organization_usage as usage
  where usage.organization_id = p_organization_id
  for update;

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

  if not found then
    return query select 'contract_missing'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_contract.status <> 'active' then
    return query select 'contract_not_active'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  select entitlement.* into v_entitlement
  from public.organization_entitlements as entitlement
  where entitlement.organization_id = p_organization_id
    and entitlement.contract_id = v_contract.id
  for update;

  if not found then
    return query select 'entitlements_missing'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  select invitation.* into v_existing
  from public.invitations as invitation
  where invitation.organization_id = p_organization_id
    and lower(trim(invitation.email)) = v_email
  for update;

  if found and v_existing.accepted_at is not null then
    return query select 'already_accepted'::text, v_existing.id, p_organization_id, v_email, v_existing.role, v_existing.seat_type, v_existing.expires_at, v_existing.created_at;
    return;
  end if;

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
  where member.organization_id = p_organization_id;

  select
    count(*)::integer,
    count(*) filter (where invitation.seat_type = v_seat_type)::integer,
    count(*) filter (where lower(coalesce(invitation.role, '')) in ('owner', 'admin'))::integer
  into v_pending_members, v_pending_seats, v_pending_admins
  from public.invitations as invitation
  where invitation.organization_id = p_organization_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now()
    and (v_existing.id is null or invitation.id <> v_existing.id);

  v_member_limit := least(v_contract.member_limit, v_entitlement.member_limit);
  v_seat_limit := case v_seat_type
    when 'full' then least(v_contract.full_user_limit, v_entitlement.full_user_limit)
    when 'participant' then least(v_contract.participant_limit, v_entitlement.participant_limit)
    else least(v_contract.viewer_limit, v_entitlement.viewer_limit)
  end;
  v_admin_limit := least(v_contract.admin_limit, v_entitlement.admin_limit);

  if v_usage.active_members + v_pending_members >= v_member_limit then
    return query select 'member_limit_reached'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  if (
    case v_seat_type
      when 'full' then v_usage.full_users
      when 'participant' then v_usage.participants
      else v_usage.viewers
    end
  ) + v_pending_seats >= v_seat_limit then
    return query select 'seat_limit_reached'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_role in ('owner', 'admin')
    and v_usage.active_admins + v_pending_admins >= v_admin_limit then
    return query select 'admin_limit_reached'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_existing.id is null then
    insert into public.invitations (
      organization_id,
      email,
      role,
      seat_type,
      token,
      invited_by,
      accepted_at,
      revoked_at,
      expires_at
    ) values (
      p_organization_id,
      v_email,
      v_role,
      v_seat_type,
      p_token,
      p_invited_by,
      null,
      null,
      p_expires_at
    ) returning * into v_invitation;
  else
    update public.invitations as invitation
    set
      role = v_role,
      seat_type = v_seat_type,
      token = p_token,
      invited_by = p_invited_by,
      accepted_at = null,
      revoked_at = null,
      expires_at = p_expires_at,
      created_at = now()
    where invitation.id = v_existing.id
      and invitation.organization_id = p_organization_id
    returning * into v_invitation;
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_organization_id,
    p_invited_by,
    'enterprise.member_invited',
    'invitation',
    v_invitation.id::text,
    jsonb_build_object(
      'email_domain', split_part(v_email, '@', 2),
      'role', v_role,
      'seat_type', v_seat_type
    )
  );

  return query select
    'created'::text,
    v_invitation.id,
    v_invitation.organization_id,
    v_invitation.email,
    v_invitation.role,
    v_invitation.seat_type,
    v_invitation.expires_at,
    v_invitation.created_at;
end;
$$;

-- Replace acceptance so the pending reservation is excluded from quota checks
-- while all other pending invitations remain protected.
create or replace function public.accept_organization_invitation_atomic(
  p_token text,
  p_user_id uuid,
  p_email text
)
returns table (
  outcome text,
  invitation_id uuid,
  organization_id uuid,
  membership_id uuid,
  applied_role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
  v_reservation record;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if nullif(trim(coalesce(p_token, '')), '') is null
    or p_user_id is null
    or v_email = '' then
    return query select 'invalid_input'::text, null::uuid, null::uuid, null::uuid, null::text;
    return;
  end if;

  select invitation.* into v_invitation
  from public.invitations as invitation
  where invitation.token = p_token
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::uuid, null::uuid, null::text;
    return;
  end if;

  if v_invitation.accepted_at is not null then
    return query select 'already_accepted'::text, v_invitation.id, v_invitation.organization_id, null::uuid, null::text;
    return;
  end if;

  if v_invitation.revoked_at is not null then
    return query select 'revoked'::text, v_invitation.id, v_invitation.organization_id, null::uuid, null::text;
    return;
  end if;

  if v_invitation.expires_at <= now() then
    return query select 'expired'::text, v_invitation.id, v_invitation.organization_id, null::uuid, null::text;
    return;
  end if;

  if lower(trim(v_invitation.email)) <> v_email then
    return query select 'email_mismatch'::text, v_invitation.id, v_invitation.organization_id, null::uuid, null::text;
    return;
  end if;

  select * into v_reservation
  from public.reserve_organization_seat_with_pending_atomic(
    v_invitation.organization_id,
    p_user_id,
    lower(trim(v_invitation.role)),
    lower(trim(v_invitation.seat_type)),
    coalesce(v_invitation.invited_by, p_user_id),
    'invitation:' || v_invitation.id::text,
    'invitation'
  );

  if v_reservation.outcome not in ('reserved', 'already_active', 'seat_changed') then
    return query select
      v_reservation.outcome,
      v_invitation.id,
      v_invitation.organization_id,
      null::uuid,
      null::text;
    return;
  end if;

  update public.invitations as invitation
  set accepted_at = now()
  where invitation.id = v_invitation.id
    and invitation.accepted_at is null
    and invitation.revoked_at is null;

  if not found then
    raise exception 'invitation_state_changed';
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_invitation.organization_id,
    p_user_id,
    'enterprise.member_invited_accepted',
    'invitation',
    v_invitation.id::text,
    jsonb_build_object(
      'membership_id', v_reservation.membership_id,
      'seat_type', v_invitation.seat_type,
      'role', v_invitation.role
    )
  );

  return query select
    'accepted'::text,
    v_invitation.id,
    v_invitation.organization_id,
    v_reservation.membership_id,
    v_reservation.applied_role;
end;
$$;

-- Only the pending-aware wrapper is exposed to backend callers.
revoke all on function public.reserve_organization_seat_atomic(uuid, uuid, text, text, uuid, text, text) from service_role;
revoke all on function public.reserve_organization_seat_with_pending_atomic(uuid, uuid, text, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.create_organization_invitation_with_seat_atomic(uuid, text, text, text, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.accept_organization_invitation_atomic(text, uuid, text) from public, anon, authenticated;

grant execute on function public.reserve_organization_seat_with_pending_atomic(uuid, uuid, text, text, uuid, text, text) to service_role;
grant execute on function public.create_organization_invitation_with_seat_atomic(uuid, text, text, text, text, uuid, timestamptz) to service_role;
grant execute on function public.accept_organization_invitation_atomic(text, uuid, text) to service_role;

notify pgrst, 'reload schema';

commit;
