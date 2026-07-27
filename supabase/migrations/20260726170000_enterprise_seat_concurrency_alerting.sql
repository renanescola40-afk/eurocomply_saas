begin;

create table if not exists public.enterprise_seat_contention_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid,
  requested_seat_type text not null check (requested_seat_type in ('full','participant','viewer')),
  outcome text not null check (outcome in ('reserved','capacity_exhausted','version_conflict','released','reconciled')),
  contract_version bigint,
  used_seats integer not null default 0 check (used_seats >= 0),
  seat_limit integer not null default 0 check (seat_limit >= 0),
  actor_user_id uuid references auth.users(id) on delete set null,
  correlation_id uuid not null default gen_random_uuid(),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists enterprise_seat_contention_events_org_created_idx
  on public.enterprise_seat_contention_events (organization_id, created_at desc);

create table if not exists public.enterprise_access_escalation_policies (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  warning_after_minutes integer not null default 15 check (warning_after_minutes between 1 and 1440),
  critical_after_minutes integer not null default 60 check (critical_after_minutes between 5 and 10080),
  dead_letter_threshold integer not null default 1 check (dead_letter_threshold between 1 and 10000),
  contention_threshold integer not null default 3 check (contention_threshold between 1 and 10000),
  email_enabled boolean not null default true,
  webhook_enabled boolean not null default false,
  webhook_secret_digest text,
  version bigint not null default 1 check (version > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (critical_after_minutes > warning_after_minutes)
);

create table if not exists public.enterprise_access_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  alert_key text not null,
  channel text not null check (channel in ('email','webhook','in_app')),
  severity text not null check (severity in ('warning','critical')),
  status text not null default 'pending' check (status in ('pending','processing','retry','delivered','dead_letter','cancelled')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  last_error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, alert_key, channel)
);

create index if not exists enterprise_access_notifications_ready_idx
  on public.enterprise_access_notifications (available_at, created_at)
  where status in ('pending','retry');

alter table public.enterprise_seat_contention_events enable row level security;
alter table public.enterprise_seat_contention_events force row level security;
alter table public.enterprise_access_escalation_policies enable row level security;
alter table public.enterprise_access_escalation_policies force row level security;
alter table public.enterprise_access_notifications enable row level security;
alter table public.enterprise_access_notifications force row level security;

revoke all on public.enterprise_seat_contention_events from public, anon, authenticated;
revoke all on public.enterprise_access_escalation_policies from public, anon, authenticated;
revoke all on public.enterprise_access_notifications from public, anon, authenticated;
grant all on public.enterprise_seat_contention_events to service_role;
grant all on public.enterprise_access_escalation_policies to service_role;
grant all on public.enterprise_access_notifications to service_role;

create policy enterprise_seat_contention_events_deny_delete
  on public.enterprise_seat_contention_events for delete to authenticated using (false);
create policy enterprise_access_notifications_deny_delete
  on public.enterprise_access_notifications for delete to authenticated using (false);

create or replace function public.reserve_enterprise_seat_with_concurrency_guard(
  p_organization_id uuid,
  p_membership_id uuid,
  p_requested_seat_type text,
  p_expected_contract_version bigint,
  p_actor_user_id uuid,
  p_correlation_id uuid default gen_random_uuid()
)
returns table (outcome text, used_seats integer, seat_limit integer, contract_version bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.enterprise_contracts%rowtype;
  v_used integer := 0;
  v_limit integer := 0;
begin
  if p_organization_id is null or p_membership_id is null
     or p_requested_seat_type not in ('full','participant','viewer') then
    return query select 'invalid_input'::text, 0, 0, 0::bigint;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 0));

  select * into v_contract
  from public.enterprise_contracts
  where organization_id = p_organization_id and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if not found then
    return query select 'contract_not_found'::text, 0, 0, 0::bigint;
    return;
  end if;

  if p_expected_contract_version is not null and v_contract.version <> p_expected_contract_version then
    insert into public.enterprise_seat_contention_events (
      organization_id,membership_id,requested_seat_type,outcome,contract_version,actor_user_id,correlation_id
    ) values (
      p_organization_id,p_membership_id,p_requested_seat_type,'version_conflict',v_contract.version,p_actor_user_id,p_correlation_id
    );
    return query select 'version_conflict'::text, 0, 0, v_contract.version;
    return;
  end if;

  select count(*) into v_used
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.status = 'active'
    and m.seat_type = 'full';

  v_limit := coalesce(v_contract.seat_limit, 0);

  if p_requested_seat_type = 'full' and v_used >= v_limit then
    insert into public.enterprise_seat_contention_events (
      organization_id,membership_id,requested_seat_type,outcome,contract_version,used_seats,seat_limit,actor_user_id,correlation_id
    ) values (
      p_organization_id,p_membership_id,p_requested_seat_type,'capacity_exhausted',v_contract.version,v_used,v_limit,p_actor_user_id,p_correlation_id
    );
    return query select 'capacity_exhausted'::text, v_used, v_limit, v_contract.version;
    return;
  end if;

  update public.organization_members
  set seat_type = p_requested_seat_type, updated_at = now()
  where organization_id = p_organization_id and id = p_membership_id;

  if not found then
    return query select 'membership_not_found'::text, v_used, v_limit, v_contract.version;
    return;
  end if;

  if p_requested_seat_type = 'full' then v_used := v_used + 1; end if;

  insert into public.enterprise_seat_contention_events (
    organization_id,membership_id,requested_seat_type,outcome,contract_version,used_seats,seat_limit,actor_user_id,correlation_id
  ) values (
    p_organization_id,p_membership_id,p_requested_seat_type,'reserved',v_contract.version,v_used,v_limit,p_actor_user_id,p_correlation_id
  );

  return query select 'reserved'::text, v_used, v_limit, v_contract.version;
end;
$$;

create or replace function public.enqueue_enterprise_access_escalations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer := 0;
begin
  insert into public.enterprise_access_notifications (organization_id,alert_key,channel,severity,payload)
  select a.organization_id,
         a.alert_key,
         case when p.webhook_enabled then 'webhook' else 'email' end,
         a.severity,
         jsonb_build_object('alertId',a.id,'alertKey',a.alert_key,'severity',a.severity)
  from public.enterprise_access_runtime_alerts a
  left join public.enterprise_access_escalation_policies p on p.organization_id = a.organization_id
  where a.status = 'open'
  on conflict (organization_id,alert_key,channel) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.claim_enterprise_access_notification()
returns table (notification_id uuid, organization_id uuid, channel text, payload jsonb, lease_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.enterprise_access_notifications%rowtype; v_token uuid := gen_random_uuid();
begin
  select * into v_row
  from public.enterprise_access_notifications
  where (status in ('pending','retry') and available_at <= now())
     or (status = 'processing' and lease_expires_at < now())
  order by available_at, created_at
  for update skip locked
  limit 1;

  if not found then return; end if;

  update public.enterprise_access_notifications
  set status='processing', attempt_count=attempt_count+1, lease_token=v_token,
      lease_expires_at=now()+interval '10 minutes', updated_at=now()
  where id=v_row.id;

  return query select v_row.id,v_row.organization_id,v_row.channel,v_row.payload,v_token;
end;
$$;

create or replace function public.complete_enterprise_access_notification(
  p_notification_id uuid,p_lease_token uuid,p_delivered boolean,p_error_code text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_attempts integer;
begin
  select attempt_count into v_attempts from public.enterprise_access_notifications
  where id=p_notification_id and status='processing' and lease_token=p_lease_token for update;
  if not found then return 'lease_mismatch'; end if;

  update public.enterprise_access_notifications
  set status = case when p_delivered then 'delivered' when v_attempts >= 5 then 'dead_letter' else 'retry' end,
      available_at = case when p_delivered or v_attempts >= 5 then available_at else now()+make_interval(secs=>least(3600,30*power(2,greatest(v_attempts-1,0))::integer)) end,
      last_error_code = case when p_delivered then null else left(coalesce(nullif(trim(p_error_code),''),'delivery_failed'),120) end,
      delivered_at = case when p_delivered then now() else delivered_at end,
      lease_token=null,lease_expires_at=null,updated_at=now()
  where id=p_notification_id;

  return case when p_delivered then 'delivered' when v_attempts >= 5 then 'dead_letter' else 'retry' end;
end;
$$;

revoke all on function public.reserve_enterprise_seat_with_concurrency_guard(uuid,uuid,text,bigint,uuid,uuid) from public,anon,authenticated;
revoke all on function public.enqueue_enterprise_access_escalations() from public,anon,authenticated;
revoke all on function public.claim_enterprise_access_notification() from public,anon,authenticated;
revoke all on function public.complete_enterprise_access_notification(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.reserve_enterprise_seat_with_concurrency_guard(uuid,uuid,text,bigint,uuid,uuid) to service_role;
grant execute on function public.enqueue_enterprise_access_escalations() to service_role;
grant execute on function public.claim_enterprise_access_notification() to service_role;
grant execute on function public.complete_enterprise_access_notification(uuid,uuid,boolean,text) to service_role;

commit;
