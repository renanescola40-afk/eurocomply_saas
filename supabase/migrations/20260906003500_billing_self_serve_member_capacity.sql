begin;

-- Enterprise keeps its existing contractual seat engine. These two billing
-- wrappers add the self-serve path advertised by Essential/Professional while
-- preserving the same transactional reservation/acceptance model.

create or replace function public.create_billing_organization_invitation_atomic(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_seat_type text,
  p_token text,
  p_invited_by uuid,
  p_expires_at timestamptz
)
returns table(
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
  v_plan text;
  v_limit integer;
  v_actor_role text;
  v_actor_status text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := lower(trim(coalesce(p_role, '')));
  v_seat_type text := lower(trim(coalesce(p_seat_type, '')));
  v_existing public.invitations%rowtype;
  v_invitation public.invitations%rowtype;
  v_active_members integer := 0;
  v_pending_members integer := 0;
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

  v_plan := app_private.resolve_commercial_plan(p_organization_id);
  if v_plan is null then
    return query select 'contract_missing'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  -- Contractual Enterprise keeps the richer full/participant/viewer/admin
  -- authority and lock order already proven by the enterprise licensing RPC.
  if v_plan = 'enterprise' then
    return query
    select * from public.create_organization_invitation_with_seat_atomic(
      p_organization_id,
      p_email,
      p_role,
      p_seat_type,
      p_token,
      p_invited_by,
      p_expires_at
    );
    return;
  end if;

  v_limit := case v_plan
    when 'starter' then 3
    when 'professional' then 15
    when 'business' then 75
    else 0
  end;

  if v_limit <= 0 then
    return query select 'entitlements_missing'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  -- Admin seats are contractual-only. The API already blocks them below
  -- Enterprise; enforce the same rule at the database authority boundary.
  if v_role in ('owner', 'admin') then
    return query select 'admin_limit_reached'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text));

  insert into public.organization_usage (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  select invitation.* into v_existing
  from public.invitations as invitation
  where invitation.organization_id = p_organization_id
    and lower(trim(invitation.email)) = v_email
  for update;

  if found and v_existing.accepted_at is not null then
    return query select 'already_accepted'::text, v_existing.id, p_organization_id, v_email, v_existing.role, v_existing.seat_type, v_existing.expires_at, v_existing.created_at;
    return;
  end if;

  select count(*) filter (where member.status = 'active')::integer
    into v_active_members
  from public.organization_members as member
  where member.organization_id = p_organization_id;

  select count(*)::integer
    into v_pending_members
  from public.invitations as invitation
  where invitation.organization_id = p_organization_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now()
    and (v_existing.id is null or invitation.id <> v_existing.id);

  if v_active_members + v_pending_members >= v_limit then
    return query select 'member_limit_reached'::text, null::uuid, p_organization_id, v_email, v_role, v_seat_type, null::timestamptz, null::timestamptz;
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
    'billing.member_invited',
    'invitation',
    v_invitation.id::text,
    jsonb_build_object(
      'email_domain', split_part(v_email, '@', 2),
      'role', v_role,
      'seat_type', v_seat_type,
      'plan', v_plan,
      'member_limit', v_limit
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

create or replace function public.accept_billing_organization_invitation_atomic(
  p_token text,
  p_user_id uuid,
  p_email text
)
returns table(
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
  v_membership public.organization_members%rowtype;
  v_organization_id uuid;
  v_plan text;
  v_limit integer;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text;
  v_seat_type text;
  v_active_members integer := 0;
  v_pending_members integer := 0;
  v_previous_active boolean := false;
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

  v_plan := app_private.resolve_commercial_plan(v_organization_id);
  if v_plan is null then
    return query select 'contract_missing'::text, null::uuid, v_organization_id, null::uuid, null::text;
    return;
  end if;

  if v_plan = 'enterprise' then
    return query
    select * from public.accept_organization_invitation_atomic(p_token, p_user_id, p_email);
    return;
  end if;

  v_limit := case v_plan
    when 'starter' then 3
    when 'professional' then 15
    when 'business' then 75
    else 0
  end;

  if v_limit <= 0 then
    return query select 'entitlements_missing'::text, null::uuid, v_organization_id, null::uuid, null::text;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_organization_id::text));

  insert into public.organization_usage (organization_id)
  values (v_organization_id)
  on conflict (organization_id) do nothing;

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

  if v_role not in ('editor', 'member', 'viewer') then
    return query select 'admin_limit_reached'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;
  if v_seat_type not in ('full', 'participant', 'viewer') then
    return query select 'invalid_seat_type'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
    return;
  end if;

  select member.* into v_membership
  from public.organization_members as member
  where member.organization_id = v_organization_id
    and member.user_id = p_user_id
  for update;

  if found then
    v_previous_active := v_membership.status = 'active';
  end if;

  select count(*) filter (where member.status = 'active')::integer
    into v_active_members
  from public.organization_members as member
  where member.organization_id = v_organization_id;

  select count(*)::integer
    into v_pending_members
  from public.invitations as invitation
  where invitation.organization_id = v_organization_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now()
    and invitation.id <> v_invitation.id;

  if not v_previous_active and v_active_members + v_pending_members >= v_limit then
    return query select 'member_limit_reached'::text, v_invitation.id, v_organization_id, null::uuid, null::text;
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
    'billing.member_invitation_accepted',
    'invitation',
    v_invitation.id::text,
    jsonb_build_object(
      'membership_id', v_membership.id,
      'seat_type', v_seat_type,
      'role', v_role,
      'plan', v_plan,
      'member_limit', v_limit
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

revoke all on function public.create_billing_organization_invitation_atomic(uuid, text, text, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.create_billing_organization_invitation_atomic(uuid, text, text, text, text, uuid, timestamptz) to service_role;

revoke all on function public.accept_billing_organization_invitation_atomic(text, uuid, text) from public, anon, authenticated;
grant execute on function public.accept_billing_organization_invitation_atomic(text, uuid, text) to service_role;

notify pgrst, 'reload schema';

commit;
