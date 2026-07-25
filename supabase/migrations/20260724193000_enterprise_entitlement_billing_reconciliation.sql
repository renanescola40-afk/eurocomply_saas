begin;

create table if not exists public.enterprise_entitlement_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_kind text not null check (source_kind in ('signed_contract','stripe_subscription','manual_override')),
  external_reference text not null,
  priority integer not null check (priority between 0 and 1000),
  active boolean not null default true,
  version bigint not null default 1 check (version > 0),
  effective_from timestamptz not null,
  effective_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_kind, external_reference),
  unique (id, organization_id)
);

create table if not exists public.enterprise_entitlement_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  source_version bigint not null check (source_version > 0),
  plan_code text not null check (char_length(plan_code) between 1 and 120),
  full_seat_limit integer not null check (full_seat_limit >= 0),
  participant_seat_limit integer not null check (participant_seat_limit >= 0),
  viewer_seat_limit integer not null check (viewer_seat_limit >= 0),
  entitlements jsonb not null default '{}'::jsonb,
  source_payload_sha256 text not null check (source_payload_sha256 ~ '^[a-f0-9]{64}$'),
  observed_at timestamptz not null,
  valid_from timestamptz not null,
  valid_until timestamptz,
  status text not null default 'observed' check (status in ('observed','applied','superseded','rejected')),
  rejection_reason text,
  applied_policy_version bigint,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key),
  unique (id, organization_id),
  foreign key (source_id, organization_id)
    references public.enterprise_entitlement_sources(id, organization_id) on delete restrict
);

create table if not exists public.enterprise_entitlement_reconciliation_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid,
  snapshot_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  outcome text not null check (outcome in ('applied','idempotent_replay','version_conflict','lower_priority','invalid_window','source_unavailable','policy_conflict','rejected')),
  expected_source_version bigint,
  observed_source_version bigint,
  previous_policy_version bigint,
  resulting_policy_version bigint,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists enterprise_entitlement_sources_org_active_idx
  on public.enterprise_entitlement_sources (organization_id, active, priority desc);
create index if not exists enterprise_entitlement_snapshots_org_created_idx
  on public.enterprise_entitlement_snapshots (organization_id, created_at desc);
create index if not exists enterprise_entitlement_events_org_created_idx
  on public.enterprise_entitlement_reconciliation_events (organization_id, created_at desc);

alter table public.enterprise_entitlement_sources enable row level security;
alter table public.enterprise_entitlement_sources force row level security;
alter table public.enterprise_entitlement_snapshots enable row level security;
alter table public.enterprise_entitlement_snapshots force row level security;
alter table public.enterprise_entitlement_reconciliation_events enable row level security;
alter table public.enterprise_entitlement_reconciliation_events force row level security;

revoke all on public.enterprise_entitlement_sources, public.enterprise_entitlement_snapshots, public.enterprise_entitlement_reconciliation_events from public, anon, authenticated;
grant all on public.enterprise_entitlement_sources, public.enterprise_entitlement_snapshots, public.enterprise_entitlement_reconciliation_events to service_role;

create policy enterprise_entitlement_sources_deny_delete on public.enterprise_entitlement_sources for delete to authenticated using (false);
create policy enterprise_entitlement_snapshots_deny_delete on public.enterprise_entitlement_snapshots for delete to authenticated using (false);
create policy enterprise_entitlement_events_deny_delete on public.enterprise_entitlement_reconciliation_events for delete to authenticated using (false);

create or replace function public.apply_enterprise_entitlement_snapshot_atomic(
  p_organization_id uuid,
  p_source_id uuid,
  p_idempotency_key text,
  p_expected_source_version bigint,
  p_plan_code text,
  p_full_seat_limit integer,
  p_participant_seat_limit integer,
  p_viewer_seat_limit integer,
  p_entitlements jsonb,
  p_source_payload_sha256 text,
  p_observed_at timestamptz,
  p_valid_from timestamptz,
  p_valid_until timestamptz,
  p_actor_user_id uuid
)
returns table (
  outcome text,
  snapshot_id uuid,
  applied_policy_version bigint,
  source_version bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.enterprise_entitlement_sources%rowtype;
  v_existing public.enterprise_entitlement_snapshots%rowtype;
  v_current_priority integer;
  v_policy_version bigint;
  v_snapshot_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':entitlement-reconcile', 0));

  select * into v_existing
  from public.enterprise_entitlement_snapshots
  where organization_id = p_organization_id and idempotency_key = p_idempotency_key;
  if found then
    return query select 'idempotent_replay'::text, v_existing.id, v_existing.applied_policy_version, v_existing.source_version;
    return;
  end if;

  select * into v_source
  from public.enterprise_entitlement_sources
  where id = p_source_id and organization_id = p_organization_id and active = true
  for update;
  if not found then
    insert into public.enterprise_entitlement_reconciliation_events (organization_id, source_id, actor_user_id, outcome, expected_source_version)
    values (p_organization_id, p_source_id, p_actor_user_id, 'source_unavailable', p_expected_source_version);
    return query select 'source_unavailable'::text, null::uuid, null::bigint, null::bigint;
    return;
  end if;

  if v_source.version <> p_expected_source_version then
    insert into public.enterprise_entitlement_reconciliation_events (organization_id, source_id, actor_user_id, outcome, expected_source_version, observed_source_version)
    values (p_organization_id, p_source_id, p_actor_user_id, 'version_conflict', p_expected_source_version, v_source.version);
    return query select 'version_conflict'::text, null::uuid, null::bigint, v_source.version;
    return;
  end if;

  if p_valid_until is not null and p_valid_until <= p_valid_from then
    return query select 'invalid_window'::text, null::uuid, null::bigint, v_source.version;
    return;
  end if;

  select max(priority) into v_current_priority
  from public.enterprise_entitlement_sources
  where organization_id = p_organization_id
    and active = true
    and effective_from <= p_observed_at
    and (effective_until is null or effective_until > p_observed_at);

  if coalesce(v_current_priority, v_source.priority) > v_source.priority then
    return query select 'lower_priority'::text, null::uuid, null::bigint, v_source.version;
    return;
  end if;

  select version into v_policy_version
  from public.enterprise_seat_policies
  where organization_id = p_organization_id
  for update;

  if found then
    update public.enterprise_seat_policies
    set full_seat_limit = p_full_seat_limit,
        participant_seat_limit = p_participant_seat_limit,
        viewer_seat_limit = p_viewer_seat_limit,
        effective_from = p_valid_from,
        effective_until = p_valid_until,
        source_type = v_source.source_kind,
        source_reference = v_source.external_reference,
        version = version + 1,
        updated_by = p_actor_user_id,
        updated_at = now()
    where organization_id = p_organization_id
    returning version into v_policy_version;
  else
    insert into public.enterprise_seat_policies (
      organization_id, full_seat_limit, participant_seat_limit, viewer_seat_limit,
      effective_from, effective_until, source_type, source_reference, version, updated_by
    ) values (
      p_organization_id, p_full_seat_limit, p_participant_seat_limit, p_viewer_seat_limit,
      p_valid_from, p_valid_until, v_source.source_kind, v_source.external_reference, 1, p_actor_user_id
    ) returning version into v_policy_version;
  end if;

  insert into public.enterprise_entitlement_snapshots (
    organization_id, source_id, idempotency_key, source_version, plan_code,
    full_seat_limit, participant_seat_limit, viewer_seat_limit, entitlements,
    source_payload_sha256, observed_at, valid_from, valid_until, status, applied_policy_version
  ) values (
    p_organization_id, p_source_id, p_idempotency_key, p_expected_source_version, p_plan_code,
    p_full_seat_limit, p_participant_seat_limit, p_viewer_seat_limit, coalesce(p_entitlements, '{}'::jsonb),
    p_source_payload_sha256, p_observed_at, p_valid_from, p_valid_until, 'applied', v_policy_version
  ) returning id into v_snapshot_id;

  update public.enterprise_entitlement_snapshots
  set status = 'superseded'
  where organization_id = p_organization_id and id <> v_snapshot_id and status = 'applied';

  insert into public.enterprise_entitlement_reconciliation_events (
    organization_id, source_id, snapshot_id, actor_user_id, outcome,
    expected_source_version, observed_source_version, resulting_policy_version
  ) values (
    p_organization_id, p_source_id, v_snapshot_id, p_actor_user_id, 'applied',
    p_expected_source_version, v_source.version, v_policy_version
  );

  return query select 'applied'::text, v_snapshot_id, v_policy_version, v_source.version;
end;
$$;

revoke all on function public.apply_enterprise_entitlement_snapshot_atomic(uuid,uuid,text,bigint,text,integer,integer,integer,jsonb,text,timestamptz,timestamptz,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.apply_enterprise_entitlement_snapshot_atomic(uuid,uuid,text,bigint,text,integer,integer,integer,jsonb,text,timestamptz,timestamptz,timestamptz,uuid) to service_role;

commit;
