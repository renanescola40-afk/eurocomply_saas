begin;

create table if not exists public.enterprise_seat_policies (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  full_limit integer not null check (full_limit >= 0),
  participant_limit integer not null check (participant_limit >= 0),
  viewer_limit integer not null check (viewer_limit >= 0),
  version bigint not null default 1 check (version > 0),
  source text not null default 'contract' check (source in ('contract','billing','manual_override')),
  source_reference text,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > effective_at)
);

create table if not exists public.enterprise_seat_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid,
  invite_email_hash text,
  seat_type text not null check (seat_type in ('full','participant','viewer')),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 200),
  status text not null default 'reserved' check (status in ('reserved','consumed','released','expired')),
  expected_policy_version bigint not null check (expected_policy_version > 0),
  reserved_by uuid references auth.users(id) on delete set null,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  released_at timestamptz,
  unique (organization_id, idempotency_key),
  check (member_id is not null or invite_email_hash ~ '^[a-f0-9]{64}$'),
  check (expires_at > reserved_at)
);

create table if not exists public.enterprise_seat_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reservation_id uuid references public.enterprise_seat_reservations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('policy_updated','reserved','consumed','released','expired','rejected')),
  seat_type text check (seat_type in ('full','participant','viewer')),
  outcome text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists enterprise_seat_reservations_active_idx
  on public.enterprise_seat_reservations (organization_id, seat_type, expires_at)
  where status = 'reserved';
create index if not exists enterprise_seat_events_org_created_idx
  on public.enterprise_seat_events (organization_id, created_at desc);

alter table public.organization_members
  add column if not exists seat_version bigint not null default 1 check (seat_version > 0);

alter table public.enterprise_seat_policies enable row level security;
alter table public.enterprise_seat_policies force row level security;
alter table public.enterprise_seat_reservations enable row level security;
alter table public.enterprise_seat_reservations force row level security;
alter table public.enterprise_seat_events enable row level security;
alter table public.enterprise_seat_events force row level security;

revoke all on public.enterprise_seat_policies, public.enterprise_seat_reservations, public.enterprise_seat_events from public, anon, authenticated;
grant all on public.enterprise_seat_policies, public.enterprise_seat_reservations, public.enterprise_seat_events to service_role;

create policy enterprise_seat_policies_deny_all on public.enterprise_seat_policies for all to authenticated using (false) with check (false);
create policy enterprise_seat_reservations_deny_all on public.enterprise_seat_reservations for all to authenticated using (false) with check (false);
create policy enterprise_seat_events_deny_all on public.enterprise_seat_events for all to authenticated using (false) with check (false);

create or replace function public.reserve_enterprise_seat_atomic(
  p_organization_id uuid,
  p_seat_type text,
  p_idempotency_key text,
  p_expected_policy_version bigint,
  p_actor_user_id uuid,
  p_member_id uuid default null,
  p_invite_email_hash text default null,
  p_ttl_seconds integer default 900
)
returns table (
  outcome text,
  reservation_id uuid,
  policy_version bigint,
  used_count integer,
  reserved_count integer,
  seat_limit integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy public.enterprise_seat_policies%rowtype;
  v_existing public.enterprise_seat_reservations%rowtype;
  v_used integer := 0;
  v_reserved integer := 0;
  v_limit integer := 0;
  v_reservation_id uuid;
begin
  if p_organization_id is null
    or p_seat_type not in ('full','participant','viewer')
    or char_length(coalesce(p_idempotency_key, '')) not between 16 and 200
    or coalesce(p_expected_policy_version, 0) <= 0
    or coalesce(p_ttl_seconds, 0) not between 60 and 86400
    or (p_member_id is null and coalesce(p_invite_email_hash, '') !~ '^[a-f0-9]{64}$') then
    return query select 'invalid_input'::text, null::uuid, 0::bigint, 0, 0, 0;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || p_seat_type, 0));

  select * into v_policy
  from public.enterprise_seat_policies
  where organization_id = p_organization_id
  for update;

  if not found or v_policy.effective_at > now() or (v_policy.expires_at is not null and v_policy.expires_at <= now()) then
    insert into public.enterprise_seat_events (organization_id, actor_user_id, action, seat_type, outcome)
    values (p_organization_id, p_actor_user_id, 'rejected', p_seat_type, 'policy_unavailable');
    return query select 'policy_unavailable'::text, null::uuid, 0::bigint, 0, 0, 0;
    return;
  end if;

  if v_policy.version <> p_expected_policy_version then
    return query select 'version_conflict'::text, null::uuid, v_policy.version, 0, 0, 0;
    return;
  end if;

  select * into v_existing
  from public.enterprise_seat_reservations
  where organization_id = p_organization_id and idempotency_key = p_idempotency_key;

  if found then
    v_limit := case v_existing.seat_type when 'full' then v_policy.full_limit when 'participant' then v_policy.participant_limit else v_policy.viewer_limit end;
    return query select 'idempotent_replay'::text, v_existing.id, v_policy.version, 0, 0, v_limit;
    return;
  end if;

  update public.enterprise_seat_reservations
  set status = 'expired'
  where organization_id = p_organization_id and seat_type = p_seat_type and status = 'reserved' and expires_at <= now();

  select count(*) into v_used
  from public.organization_members
  where organization_id = p_organization_id and status = 'active' and seat_type = p_seat_type;

  select count(*) into v_reserved
  from public.enterprise_seat_reservations
  where organization_id = p_organization_id and seat_type = p_seat_type and status = 'reserved' and expires_at > now();

  v_limit := case p_seat_type when 'full' then v_policy.full_limit when 'participant' then v_policy.participant_limit else v_policy.viewer_limit end;

  if v_used + v_reserved >= v_limit then
    insert into public.enterprise_seat_events (organization_id, actor_user_id, action, seat_type, outcome, metadata)
    values (p_organization_id, p_actor_user_id, 'rejected', p_seat_type, 'seat_limit_reached', jsonb_build_object('used', v_used, 'reserved', v_reserved, 'limit', v_limit));
    return query select 'seat_limit_reached'::text, null::uuid, v_policy.version, v_used, v_reserved, v_limit;
    return;
  end if;

  insert into public.enterprise_seat_reservations (
    organization_id, member_id, invite_email_hash, seat_type, idempotency_key,
    expected_policy_version, reserved_by, expires_at
  ) values (
    p_organization_id, p_member_id, p_invite_email_hash, p_seat_type, p_idempotency_key,
    p_expected_policy_version, p_actor_user_id, now() + make_interval(secs => p_ttl_seconds)
  ) returning id into v_reservation_id;

  insert into public.enterprise_seat_events (organization_id, reservation_id, actor_user_id, action, seat_type, outcome)
  values (p_organization_id, v_reservation_id, p_actor_user_id, 'reserved', p_seat_type, 'reserved');

  return query select 'reserved'::text, v_reservation_id, v_policy.version, v_used, v_reserved + 1, v_limit;
end;
$$;

create or replace function public.consume_enterprise_seat_reservation_atomic(
  p_organization_id uuid,
  p_reservation_id uuid,
  p_member_id uuid,
  p_expected_member_seat_version bigint,
  p_actor_user_id uuid
)
returns table (outcome text, member_seat_version bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.enterprise_seat_reservations%rowtype;
  v_member public.organization_members%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':consume:' || p_reservation_id::text, 0));

  select * into v_reservation from public.enterprise_seat_reservations
  where id = p_reservation_id and organization_id = p_organization_id for update;
  if not found then return query select 'reservation_not_found'::text, 0::bigint; return; end if;
  if v_reservation.status = 'consumed' then return query select 'idempotent_replay'::text, coalesce((select seat_version from public.organization_members where organization_id = p_organization_id and id = p_member_id), 0); return; end if;
  if v_reservation.status <> 'reserved' or v_reservation.expires_at <= now() then return query select 'reservation_unavailable'::text, 0::bigint; return; end if;

  select * into v_member from public.organization_members
  where organization_id = p_organization_id and id = p_member_id for update;
  if not found then return query select 'member_not_found'::text, 0::bigint; return; end if;
  if v_member.seat_version <> p_expected_member_seat_version then return query select 'version_conflict'::text, v_member.seat_version; return; end if;

  update public.organization_members
  set seat_type = v_reservation.seat_type, status = 'active', seat_version = seat_version + 1
  where organization_id = p_organization_id and id = p_member_id;

  update public.enterprise_seat_reservations
  set status = 'consumed', member_id = p_member_id, consumed_at = now()
  where id = p_reservation_id;

  insert into public.enterprise_seat_events (organization_id, reservation_id, actor_user_id, action, seat_type, outcome)
  values (p_organization_id, p_reservation_id, p_actor_user_id, 'consumed', v_reservation.seat_type, 'consumed');

  return query select 'consumed'::text, v_member.seat_version + 1;
end;
$$;

revoke all on function public.reserve_enterprise_seat_atomic(uuid,text,text,bigint,uuid,uuid,text,integer) from public, anon, authenticated;
revoke all on function public.consume_enterprise_seat_reservation_atomic(uuid,uuid,uuid,bigint,uuid) from public, anon, authenticated;
grant execute on function public.reserve_enterprise_seat_atomic(uuid,text,text,bigint,uuid,uuid,text,integer) to service_role;
grant execute on function public.consume_enterprise_seat_reservation_atomic(uuid,uuid,uuid,bigint,uuid) to service_role;

commit;
