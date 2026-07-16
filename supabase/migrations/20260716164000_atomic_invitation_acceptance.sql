-- Atomically consume an organization invitation and create its membership.
-- The service-role-only RPC prevents partial access grants and invite replay.

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
  v_membership public.organization_members%rowtype;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if nullif(trim(coalesce(p_token, '')), '') is null
    or p_user_id is null
    or v_email = '' then
    return query select 'invalid_input'::text, null::uuid, null::uuid, null::uuid, null::text;
    return;
  end if;

  select invitation.*
    into v_invitation
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

  -- Never mutate an existing membership's role through an invitation replay or
  -- a stale invitation. A new membership receives the invitation role.
  insert into public.organization_members (organization_id, user_id, role)
  values (v_invitation.organization_id, p_user_id, lower(trim(v_invitation.role)))
  on conflict (organization_id, user_id) do nothing;

  select membership.*
    into v_membership
  from public.organization_members as membership
  where membership.organization_id = v_invitation.organization_id
    and membership.user_id = p_user_id;

  if not found then
    raise exception 'membership_not_persisted';
  end if;

  update public.invitations as invitation
  set accepted_at = now()
  where invitation.id = v_invitation.id
    and invitation.accepted_at is null;

  if not found then
    raise exception 'invitation_state_changed';
  end if;

  return query select
    'accepted'::text,
    v_invitation.id,
    v_invitation.organization_id,
    v_membership.id,
    v_membership.role;
end;
$$;

revoke all on function public.accept_organization_invitation_atomic(text, uuid, text) from public;
revoke all on function public.accept_organization_invitation_atomic(text, uuid, text) from anon;
revoke all on function public.accept_organization_invitation_atomic(text, uuid, text) from authenticated;
grant execute on function public.accept_organization_invitation_atomic(text, uuid, text) to service_role;

notify pgrst, 'reload schema';
