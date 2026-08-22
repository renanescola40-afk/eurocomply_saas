begin;

-- Forward-only reconciliation for the active team invitation runtime.
-- Historical Enterprise licensing/invitation migrations remain immutable.
-- This identity runs after the bounded Enterprise licensing control plane so
-- all quota tables and seat columns exist before the RPC authority is exposed.

do $preflight$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_members') is null
     or to_regclass('public.invitations') is null
     or to_regclass('public.enterprise_contracts') is null
     or to_regclass('public.organization_entitlements') is null
     or to_regclass('public.organization_usage') is null
     or to_regclass('public.audit_logs') is null then
    raise exception 'enterprise invitation seat-authority prerequisites are incomplete';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organization_members'
      and column_name = 'seat_type'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organization_members'
      and column_name = 'status'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invitations'
      and column_name = 'seat_type'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invitations'
      and column_name = 'revoked_at'
  ) then
    raise exception 'enterprise seat columns must be reconciled before invitation authority';
  end if;
end
$preflight$;

create or replace function public.sync_organization_pending_invitation_usage()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
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

revoke all on function public.sync_organization_pending_invitation_usage() from public, anon, authenticated;
grant execute on function public.sync_organization_pending_invitation_usage() to service_role;

drop trigger if exists invitations_sync_pending_usage on public.invitations;
create trigger invitations_sync_pending_usage
after insert or update of accepted_at, revoked_at, expires_at or delete
on public.invitations
for each row execute function public.sync_organization_pending_invitation_usage();

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
set search_path = pg_catalog, public
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_usage public.organization_usage%rowtype;
  v_existing public.invitations%rowtype;
  v_invitation public.invitations%rowtype;
  v_actor_role text;
  v_actor_status text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := lower(trim(coalesce(p_role, '')));
  v_seat_type text := lower(trim(coalesce(p_seat_type, '')));
  v_pending_members integer := 0;
  v_pending_seats integer := 0;
  v_pending_admins integer := 0;
  v_active_members integer := 0;
  v_active_seats integer := 0;
  v_active_admins integer := 0;
  v_member_limit integer;
  v_seat_limit integer;
  v_admin_limit integer;
begin
  if p_organization_id is null
     or p_invited_by is null
     or v_email = ''
     or char_length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
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

  select lower(trim(member.role)), lower(trim(member.status))
  into v_actor_role, v_actor_status
  from public.organization_members as member
  where member.organization_id = p_organization_id
    and member.user_id = p_invited_by;

  if v_actor_status is distinct from 'active'
     or coalesce(v_actor_role, '') not in ('owner', 'admin') then
    return query select 'forbidden'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  -- Canonical lock order: usage -> invitation -> contract -> entitlement.
  insert into public.organization_usage (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  select usage.* into v_usage
  from public.organization_usage as usage
  where usage.organization_id = p_organization_id
  for update;

  select invitation.* into v_existing
  from public.invitations as invitation
  where invitation.organization_id = p_organization_id
    and lower(trim(invitation.email)) = v_email
  for update;

  if found and v_existing.accepted_at is not null then
    return query select 'already_accepted'::text, v_existing.id, p_organization_id, v_email, v_existing.role, v_existing.seat_type, v_existing.expires_at, v_existing.created_at;
    return;
  end if;

  select contract.* into v_contract
  from public.enterprise_contracts as contract
  where contract.organization_id = p_organization_id
    and contract.status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended')
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

  select
    count(*) filter (where member.status = 'active')::integer,
    count(*) filter (where member.status = 'active' and member.seat_type = v_seat_type)::integer,
    count(*) filter (where member.status = 'active' and lower(coalesce(member.role, '')) in ('owner','admin'))::integer
  into v_active_members, v_active_seats, v_active_admins
  from public.organization_members as member
  where member.organization_id = p_organization_id;

  select
    count(*)::integer,
    count(*) filter (where invitation.seat_type = v_seat_type)::integer,
    count(*) filter (where lower(coalesce(invitation.role, '')) in ('owner','admin'))::integer
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

  if v_active_members + v_pending_members >= v_member_limit then
    return query select 'member_limit_reached'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_active_seats + v_pending_seats >= v_seat_limit then
    return query select 'seat_limit_reached'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_role in ('owner','admin') and v_active_admins + v_pending_admins >= v_admin_limit then
    return query select 'admin_limit_reached'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_existing.id is null then
    insert into public.invitations (
      organization_id, email, role, seat_type, token, invited_by,
      accepted_at, revoked_at, expires_at
    ) values (
      p_organization_id, v_email, v_role, v_seat_type, p_token, p_invited_by,
      null, null, p_expires_at
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

  update public.organization_usage as usage
  set
    pending_invitations = (
      select count(*)::integer
      from public.invitations as invitation
      where invitation.organization_id = p_organization_id
        and invitation.accepted_at is null
        and invitation.revoked_at is null
        and invitation.expires_at > now()
    ),
    updated_at = now()
  where usage.organization_id = p_organization_id;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
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
set search_path = pg_catalog, public
as $$
declare
  v_invitation public.invitations%rowtype;
  v_organization_id uuid;
  v_contract public.enterprise_contracts%rowtype;
  v_entitlement public.organization_entitlements%rowtype;
  v_membership public.organization_members%rowtype;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text;
  v_seat_type text;
  v_active_members integer := 0;
  v_active_seats integer := 0;
  v_active_admins integer := 0;
  v_pending_members integer := 0;
  v_pending_seats integer := 0;
  v_pending_admins integer := 0;
  v_member_limit integer;
  v_seat_limit integer;
  v_admin_limit integer;
  v_previous_active boolean := false;
  v_previous_seat_type text;
begin
  if nullif(trim(coalesce(p_token, '')), '') is null
     or p_user_id is null
     or v_email = '' then
    return query select 'invalid_input'::text, null::uuid, null::uuid, null::uuid, null::text;
    return;
  end if;

  select invitation.organization_id
  into v_organization_id
  from public.invitations as invitation
  where invitation.token = p_token;

  if not found then
    return query select 'not_found'::text, null::uuid, null::uuid, null::uuid, null::text;
    return;
  end if;

  insert into public.organization_usage (organization_id)
  values (v_organization_id)
  on conflict (organization_id) do nothing;

  perform 1
  from public.organization_usage as usage
  where usage.organization_id = v_organization_id
  for update;

  select invitation.* into v_invitation
  from public.invitations as invitation
  where invitation.token = p_token
    and invitation.organization_id = v_organization_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, v_organization_id, null::uuid, null::text;
    return;
  end if;

  if v_invitation.accepted_at is not null then
    return query select 'already_accepted'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;
  if v_invitation.revoked_at is not null then
    return query select 'revoked'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;
  if v_invitation.expires_at <= now() then
    return query select 'expired'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;
  if lower(trim(v_invitation.email)) <> v_email then
    return query select 'email_mismatch'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;

  v_role := lower(trim(coalesce(v_invitation.role, '')));
  v_seat_type := lower(trim(coalesce(v_invitation.seat_type, '')));
  if v_role not in ('owner','admin','editor','member','viewer') then
    return query select 'invalid_role'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;
  if v_seat_type not in ('full','participant','viewer') then
    return query select 'invalid_seat_type'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;

  select contract.* into v_contract
  from public.enterprise_contracts as contract
  where contract.organization_id = v_organization_id
    and contract.status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended')
  order by contract.version desc, contract.updated_at desc
  limit 1
  for update;

  if not found then
    return query select 'contract_missing'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;
  if v_contract.status <> 'active' then
    return query select 'contract_not_active'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;

  select entitlement.* into v_entitlement
  from public.organization_entitlements as entitlement
  where entitlement.organization_id = v_organization_id
    and entitlement.contract_id = v_contract.id
  for update;

  if not found then
    return query select 'entitlements_missing'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;

  select member.* into v_membership
  from public.organization_members as member
  where member.organization_id = v_organization_id
    and member.user_id = p_user_id
  for update;

  if found then
    v_previous_active := v_membership.status = 'active';
    v_previous_seat_type := v_membership.seat_type;
  end if;

  select
    count(*) filter (where member.status = 'active')::integer,
    count(*) filter (where member.status = 'active' and member.seat_type = v_seat_type)::integer,
    count(*) filter (where member.status = 'active' and lower(coalesce(member.role, '')) in ('owner','admin'))::integer
  into v_active_members, v_active_seats, v_active_admins
  from public.organization_members as member
  where member.organization_id = v_organization_id;

  select
    count(*)::integer,
    count(*) filter (where invitation.seat_type = v_seat_type)::integer,
    count(*) filter (where lower(coalesce(invitation.role, '')) in ('owner','admin'))::integer
  into v_pending_members, v_pending_seats, v_pending_admins
  from public.invitations as invitation
  where invitation.organization_id = v_organization_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now()
    and invitation.id <> v_invitation.id;

  v_member_limit := least(v_contract.member_limit, v_entitlement.member_limit);
  v_seat_limit := case v_seat_type
    when 'full' then least(v_contract.full_user_limit, v_entitlement.full_user_limit)
    when 'participant' then least(v_contract.participant_limit, v_entitlement.participant_limit)
    else least(v_contract.viewer_limit, v_entitlement.viewer_limit)
  end;
  v_admin_limit := least(v_contract.admin_limit, v_entitlement.admin_limit);

  if not v_previous_active and v_active_members + v_pending_members >= v_member_limit then
    return query select 'member_limit_reached'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;
  if (not v_previous_active or v_previous_seat_type <> v_seat_type)
     and v_active_seats + v_pending_seats >= v_seat_limit then
    return query select 'seat_limit_reached'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;
  if v_role in ('owner','admin')
     and (not v_previous_active or lower(coalesce(v_membership.role, '')) not in ('owner','admin'))
     and v_active_admins + v_pending_admins >= v_admin_limit then
    return query select 'admin_limit_reached'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;

  insert into public.organization_members (
    organization_id, user_id, role, seat_type, status, updated_at
  ) values (
    v_organization_id, p_user_id, v_role, v_seat_type, 'active', now()
  )
  on conflict (organization_id, user_id) do update set
    role = excluded.role,
    seat_type = excluded.seat_type,
    status = 'active',
    updated_at = now()
  returning * into v_membership;

  update public.invitations as invitation
  set accepted_at = now()
  where invitation.id = v_invitation.id
    and invitation.organization_id = v_organization_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null;

  if not found then
    raise exception 'invitation_state_changed';
  end if;

  update public.organization_usage as usage
  set
    active_members = (select count(*)::integer from public.organization_members m where m.organization_id = v_organization_id and m.status = 'active'),
    full_users = (select count(*)::integer from public.organization_members m where m.organization_id = v_organization_id and m.status = 'active' and m.seat_type = 'full'),
    participants = (select count(*)::integer from public.organization_members m where m.organization_id = v_organization_id and m.status = 'active' and m.seat_type = 'participant'),
    viewers = (select count(*)::integer from public.organization_members m where m.organization_id = v_organization_id and m.status = 'active' and m.seat_type = 'viewer'),
    active_admins = (select count(*)::integer from public.organization_members m where m.organization_id = v_organization_id and m.status = 'active' and lower(coalesce(m.role, '')) in ('owner','admin')),
    pending_invitations = (select count(*)::integer from public.invitations i where i.organization_id = v_organization_id and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()),
    last_reconciled_at = now(),
    updated_at = now()
  where usage.organization_id = v_organization_id;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    v_organization_id,
    p_user_id,
    'enterprise.member_invited_accepted',
    'invitation',
    v_invitation.id::text,
    jsonb_build_object(
      'membership_id', v_membership.id,
      'seat_type', v_seat_type,
      'role', v_role
    )
  );

  return query select
    'accepted'::text,
    v_invitation.id,
    v_organization_id,
    v_membership.id,
    v_membership.role;
end;
$$;

revoke all on function public.create_organization_invitation_with_seat_atomic(uuid, text, text, text, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.accept_organization_invitation_atomic(text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_organization_invitation_with_seat_atomic(uuid, text, text, text, text, uuid, timestamptz) to service_role;
grant execute on function public.accept_organization_invitation_atomic(text, uuid, text) to service_role;

do $verify$
declare
  create_oid oid := to_regprocedure('public.create_organization_invitation_with_seat_atomic(uuid,text,text,text,text,uuid,timestamptz)');
  accept_oid oid := to_regprocedure('public.accept_organization_invitation_atomic(text,uuid,text)');
  sync_oid oid := to_regprocedure('public.sync_organization_pending_invitation_usage()');
begin
  if create_oid is null or accept_oid is null or sync_oid is null then
    raise exception 'enterprise invitation seat-authority functions are incomplete';
  end if;

  if has_function_privilege('anon', create_oid, 'EXECUTE')
     or has_function_privilege('authenticated', create_oid, 'EXECUTE')
     or not has_function_privilege('service_role', create_oid, 'EXECUTE')
     or has_function_privilege('anon', accept_oid, 'EXECUTE')
     or has_function_privilege('authenticated', accept_oid, 'EXECUTE')
     or not has_function_privilege('service_role', accept_oid, 'EXECUTE') then
    raise exception 'enterprise invitation seat-authority privileges are not canonical';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.invitations'::regclass
      and tgname = 'invitations_sync_pending_usage'
      and not tgisinternal
  ) then
    raise exception 'enterprise invitation pending-usage trigger is missing';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
