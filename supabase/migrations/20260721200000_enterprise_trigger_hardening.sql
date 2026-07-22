-- Make trigger-row selection explicit for INSERT/UPDATE/DELETE operations.
-- This avoids relying on an unassigned NEW or OLD record and keeps usage
-- reconciliation deterministic on every supported PostgreSQL trigger path.

begin;

create or replace function public.sync_organization_pending_invitation_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  if tg_op = 'DELETE' then
    v_organization_id := old.organization_id;
  else
    v_organization_id := new.organization_id;
  end if;

  if v_organization_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
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

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.sync_organization_member_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_usage public.organization_usage%rowtype;
begin
  if tg_op = 'DELETE' then
    v_organization_id := old.organization_id;
  else
    v_organization_id := new.organization_id;
  end if;

  if v_organization_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
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

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.sync_organization_pending_invitation_usage() from public, anon, authenticated;
revoke all on function public.sync_organization_member_usage() from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
