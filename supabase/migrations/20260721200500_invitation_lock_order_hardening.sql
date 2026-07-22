-- Enforce the same lock order for invitation creation/resend and acceptance:
-- organization_usage -> invitation -> contract/entitlements. This prevents a
-- deadlock where one transaction holds the invitation while waiting for usage
-- and another holds usage while waiting for the invitation.

begin;

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
  v_organization_id uuid;
  v_reservation record;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if nullif(trim(coalesce(p_token, '')), '') is null
    or p_user_id is null
    or v_email = '' then
    return query select 'invalid_input'::text, null::uuid, null::uuid, null::uuid, null::text;
    return;
  end if;

  -- Discover the tenant without locking the invitation. The authoritative row
  -- is read again beneath the organization usage lock before any state change.
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

  if lower(trim(v_invitation.role)) not in ('owner', 'admin', 'editor', 'member', 'viewer') then
    return query select 'invalid_role'::text, v_invitation.id, v_invitation.organization_id, null::uuid, null::text;
    return;
  end if;

  if lower(trim(v_invitation.seat_type)) not in ('full', 'participant', 'viewer') then
    return query select 'invalid_seat_type'::text, v_invitation.id, v_invitation.organization_id, null::uuid, null::text;
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
    and invitation.organization_id = v_invitation.organization_id
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

revoke all on function public.accept_organization_invitation_atomic(text, uuid, text) from public, anon, authenticated;
grant execute on function public.accept_organization_invitation_atomic(text, uuid, text) to service_role;

notify pgrst, 'reload schema';

commit;
