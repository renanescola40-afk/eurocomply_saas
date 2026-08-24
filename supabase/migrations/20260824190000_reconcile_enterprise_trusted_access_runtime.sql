begin;

-- Forward-only reconciliation for the Enterprise Team & Access control plane.
-- This intentionally does not replay the historical 20260724-20260728 access
-- migrations because those files target an older SCIM/licensing contract and
-- the runtime-SLO migration references the obsolete enterprise_access_operation_runs
-- relation. This migration targets the post-V20 licensing + SCIM schema.

create extension if not exists pgcrypto;

do $preflight$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_members') is null
     or to_regclass('public.enterprise_contracts') is null
     or to_regclass('public.organization_entitlements') is null
     or to_regclass('public.enterprise_seat_operations') is null
     or to_regclass('public.enterprise_scim_identities') is null
     or to_regprocedure('public.reserve_organization_seat_idempotent_atomic(uuid,uuid,text,text,uuid,text,text)') is null then
    raise exception 'trusted access runtime requires the governed Enterprise licensing + SCIM plane';
  end if;
end
$preflight$;

-- ---------------------------------------------------------------------------
-- Durable access-operation queue. The reconciled implementation treats active
-- SCIM identity role/seat state as the desired state and never depends on the
-- historical group-access tables that are not part of V20.
-- ---------------------------------------------------------------------------

create table if not exists public.enterprise_access_operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_type text not null check (operation_type in ('group_reconciliation','member_export','policy_recompute')),
  status text not null default 'pending' check (status in ('pending','processing','paused','retry','completed','cancelled','dead_letter')),
  requested_by uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(reason) between 8 and 500),
  batch_size integer not null default 100 check (batch_size between 1 and 500),
  attempts integer not null default 0 check (attempts between 0 and 10),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  total_candidates integer not null default 0 check (total_candidates >= 0),
  processed_count integer not null default 0 check (processed_count >= 0),
  succeeded_count integer not null default 0 check (succeeded_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  compensated_count integer not null default 0 check (compensated_count >= 0),
  last_error_code text,
  cancellation_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enterprise_access_operations_ready_idx
  on public.enterprise_access_operations (available_at, created_at)
  where status in ('pending','retry');
create index if not exists enterprise_access_operations_org_created_idx
  on public.enterprise_access_operations (organization_id, created_at desc);
create unique index if not exists enterprise_access_operations_active_org_type_unique
  on public.enterprise_access_operations (organization_id, operation_type)
  where status in ('pending','processing','paused','retry');

create table if not exists public.enterprise_access_operation_items (
  operation_id uuid not null references public.enterprise_access_operations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_id uuid not null references public.enterprise_scim_identities(id) on delete cascade,
  membership_id uuid references public.organization_members(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_role text,
  requested_role text not null,
  previous_seat_type text,
  requested_seat_type text not null check (requested_seat_type in ('full','participant','viewer')),
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed','skipped','compensated')),
  outcome_code text,
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 200),
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,
  error_detail text,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (operation_id, identity_id)
);

create index if not exists enterprise_access_operation_items_status_idx
  on public.enterprise_access_operation_items (operation_id, status, identity_id);

create table if not exists public.enterprise_access_operation_events (
  id bigint generated always as identity primary key,
  operation_id uuid not null references public.enterprise_access_operations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.enterprise_access_operations enable row level security;
alter table public.enterprise_access_operations force row level security;
alter table public.enterprise_access_operation_items enable row level security;
alter table public.enterprise_access_operation_items force row level security;
alter table public.enterprise_access_operation_events enable row level security;
alter table public.enterprise_access_operation_events force row level security;

revoke all on public.enterprise_access_operations from public, anon, authenticated;
revoke all on public.enterprise_access_operation_items from public, anon, authenticated;
revoke all on public.enterprise_access_operation_events from public, anon, authenticated;
grant select, insert, update on public.enterprise_access_operations to service_role;
grant select, insert, update on public.enterprise_access_operation_items to service_role;
grant select, insert on public.enterprise_access_operation_events to service_role;

create policy enterprise_access_operations_authenticated_select_deny
  on public.enterprise_access_operations for select to authenticated using (false);
create policy enterprise_access_operations_authenticated_insert_deny
  on public.enterprise_access_operations for insert to authenticated with check (false);
create policy enterprise_access_operations_authenticated_update_deny
  on public.enterprise_access_operations for update to authenticated using (false) with check (false);
create policy enterprise_access_operations_authenticated_delete_deny
  on public.enterprise_access_operations for delete to authenticated using (false);
create policy enterprise_access_operation_items_authenticated_select_deny
  on public.enterprise_access_operation_items for select to authenticated using (false);
create policy enterprise_access_operation_items_authenticated_insert_deny
  on public.enterprise_access_operation_items for insert to authenticated with check (false);
create policy enterprise_access_operation_items_authenticated_update_deny
  on public.enterprise_access_operation_items for update to authenticated using (false) with check (false);
create policy enterprise_access_operation_items_authenticated_delete_deny
  on public.enterprise_access_operation_items for delete to authenticated using (false);
create policy enterprise_access_operation_events_authenticated_select_deny
  on public.enterprise_access_operation_events for select to authenticated using (false);
create policy enterprise_access_operation_events_authenticated_insert_deny
  on public.enterprise_access_operation_events for insert to authenticated with check (false);
create policy enterprise_access_operation_events_authenticated_update_deny
  on public.enterprise_access_operation_events for update to authenticated using (false) with check (false);
create policy enterprise_access_operation_events_authenticated_delete_deny
  on public.enterprise_access_operation_events for delete to authenticated using (false);

create or replace function public.create_enterprise_access_operation(
  p_organization_id uuid,
  p_operation_type text,
  p_requested_by uuid,
  p_reason text,
  p_batch_size integer default 100
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_operation_id uuid;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if p_organization_id is null or p_requested_by is null
     or p_operation_type not in ('group_reconciliation','member_export','policy_recompute')
     or char_length(v_reason) not between 8 and 500 then
    raise exception 'invalid_access_operation_input';
  end if;

  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = p_requested_by
      and m.status = 'active'
      and lower(coalesce(m.role,'')) in ('owner','admin')
  ) then
    raise exception 'access_operation_actor_forbidden';
  end if;

  insert into public.enterprise_access_operations (
    organization_id, operation_type, requested_by, reason, batch_size
  ) values (
    p_organization_id, p_operation_type, p_requested_by, v_reason,
    least(greatest(coalesce(p_batch_size,100),1),500)
  ) returning id into v_operation_id;

  insert into public.enterprise_access_operation_events (
    operation_id, organization_id, actor_user_id, event_type, reason
  ) values (v_operation_id,p_organization_id,p_requested_by,'created',v_reason);

  return v_operation_id;
exception
  when unique_violation then
    select id into v_operation_id
    from public.enterprise_access_operations
    where organization_id=p_organization_id
      and operation_type=p_operation_type
      and status in ('pending','processing','paused','retry')
    order by created_at desc limit 1;
    return v_operation_id;
end;
$$;

create or replace function public.seed_enterprise_access_operation_items(
  p_operation_id uuid,
  p_limit integer default 10000
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_operation public.enterprise_access_operations%rowtype;
  v_inserted integer := 0;
begin
  select * into v_operation from public.enterprise_access_operations
  where id=p_operation_id for update;
  if not found then raise exception 'access_operation_not_found'; end if;
  if v_operation.status not in ('pending','paused','retry') then return 0; end if;

  insert into public.enterprise_access_operation_items (
    operation_id,organization_id,identity_id,membership_id,user_id,
    previous_role,requested_role,previous_seat_type,requested_seat_type,
    idempotency_key,before_snapshot
  )
  select
    v_operation.id,
    i.organization_id,
    i.id,
    m.id,
    i.user_id,
    lower(coalesce(m.role,'')),
    lower(i.role),
    lower(coalesce(m.seat_type,'full')),
    lower(i.seat_type),
    'access-op:' || encode(digest(v_operation.id::text || ':' || i.id::text || ':' || i.role || ':' || i.seat_type,'sha256'),'hex'),
    jsonb_build_object('role',m.role,'seatType',m.seat_type,'status',m.status)
  from public.enterprise_scim_identities i
  join public.organization_members m
    on m.organization_id=i.organization_id and m.user_id=i.user_id
  where i.organization_id=v_operation.organization_id
    and i.active=true
    and m.status='active'
    and lower(coalesce(m.role,'')) <> 'owner'
    and (
      lower(coalesce(m.role,'')) is distinct from lower(i.role)
      or lower(coalesce(m.seat_type,'full')) is distinct from lower(i.seat_type)
    )
  order by i.id
  limit least(greatest(coalesce(p_limit,10000),1),10000)
  on conflict (operation_id,identity_id) do nothing;

  get diagnostics v_inserted = row_count;
  update public.enterprise_access_operations
  set total_candidates=(select count(*) from public.enterprise_access_operation_items where operation_id=v_operation.id),
      updated_at=now()
  where id=v_operation.id;
  return v_inserted;
end;
$$;

create or replace function public.claim_enterprise_access_operation()
returns table (operation_id uuid,organization_id uuid,operation_type text,batch_size integer,lease_token uuid)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_operation public.enterprise_access_operations%rowtype;
  v_token uuid := gen_random_uuid();
begin
  select * into v_operation from public.enterprise_access_operations
  where (status in ('pending','retry') and available_at<=now())
     or (status='processing' and lease_expires_at<now())
  order by available_at,created_at for update skip locked limit 1;
  if not found then return; end if;

  update public.enterprise_access_operations
  set status='processing',attempts=attempts+1,lease_token=v_token,
      lease_expires_at=now()+interval '10 minutes',started_at=coalesce(started_at,now()),updated_at=now()
  where id=v_operation.id;

  return query select v_operation.id,v_operation.organization_id,v_operation.operation_type,v_operation.batch_size,v_token;
end;
$$;

create or replace function public.claim_enterprise_access_operation_item(p_operation_id uuid,p_lease_token uuid)
returns table (
  identity_id uuid,organization_id uuid,membership_id uuid,user_id uuid,
  source_group_id uuid,department_key text,requested_role text,requested_seat_type text,idempotency_key text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_operation public.enterprise_access_operations%rowtype;
  v_item public.enterprise_access_operation_items%rowtype;
begin
  select * into v_operation from public.enterprise_access_operations where id=p_operation_id for update;
  if not found or v_operation.status in ('completed','cancelled','dead_letter') then return; end if;
  if v_operation.lease_token is distinct from p_lease_token then return; end if;

  select * into v_item from public.enterprise_access_operation_items
  where operation_id=p_operation_id and status in ('pending','failed') and attempt_count<10
  order by identity_id for update skip locked limit 1;
  if not found then return; end if;

  update public.enterprise_access_operation_items
  set status='processing',attempt_count=attempt_count+1,started_at=coalesce(started_at,now()),updated_at=now()
  where operation_id=p_operation_id and identity_id=v_item.identity_id;

  return query select v_item.identity_id,v_item.organization_id,v_item.membership_id,v_item.user_id,
    null::uuid,null::text,v_item.requested_role,v_item.requested_seat_type,v_item.idempotency_key;
end;
$$;

create or replace function public.finish_enterprise_access_operation_item(
  p_operation_id uuid,p_identity_id uuid,p_status text,p_outcome_code text,
  p_after_snapshot jsonb default '{}'::jsonb,p_error_detail text default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_status not in ('succeeded','failed','skipped','compensated') then return 'invalid_status'; end if;
  update public.enterprise_access_operation_items
  set status=p_status,outcome_code=left(coalesce(p_outcome_code,'unknown'),120),
      after_snapshot=coalesce(p_after_snapshot,'{}'::jsonb),error_detail=left(p_error_detail,500),
      completed_at=now(),updated_at=now()
  where operation_id=p_operation_id and identity_id=p_identity_id;
  if not found then return 'not_found'; end if;
  return 'recorded';
end;
$$;

create or replace function public.finalize_enterprise_access_operation(p_operation_id uuid,p_lease_token uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_pending integer;
  v_failed integer;
begin
  if not exists (select 1 from public.enterprise_access_operations where id=p_operation_id and status='processing' and lease_token=p_lease_token)
    then return 'lease_mismatch'; end if;

  select count(*) filter (where status in ('pending','processing')),
         count(*) filter (where status='failed')
  into v_pending,v_failed
  from public.enterprise_access_operation_items where operation_id=p_operation_id;

  update public.enterprise_access_operations o
  set processed_count=s.processed,succeeded_count=s.succeeded,failed_count=s.failed,
      skipped_count=s.skipped,compensated_count=s.compensated,
      status=case
        when v_pending>0 then 'retry'
        when v_failed>0 and attempts>=max_attempts then 'dead_letter'
        when v_failed>0 then 'retry'
        else 'completed' end,
      available_at=case when v_pending>0 or v_failed>0 then now()+interval '30 seconds' else available_at end,
      lease_token=null,lease_expires_at=null,
      completed_at=case when v_pending=0 and v_failed=0 then now() else completed_at end,
      updated_at=now()
  from (
    select count(*) filter (where status in ('succeeded','failed','skipped','compensated'))::integer processed,
           count(*) filter (where status='succeeded')::integer succeeded,
           count(*) filter (where status='failed')::integer failed,
           count(*) filter (where status='skipped')::integer skipped,
           count(*) filter (where status='compensated')::integer compensated
    from public.enterprise_access_operation_items where operation_id=p_operation_id
  ) s
  where o.id=p_operation_id;
  return 'finalized';
end;
$$;

create or replace function public.control_enterprise_access_operation(
  p_operation_id uuid,p_organization_id uuid,p_actor_user_id uuid,p_action text,p_reason text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_reason text := trim(coalesce(p_reason,''));
begin
  if p_action not in ('pause','resume','cancel','retry_failed') or char_length(v_reason) not between 8 and 500 then
    return 'invalid_input';
  end if;
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id=p_organization_id and m.user_id=p_actor_user_id and m.status='active'
      and lower(coalesce(m.role,'')) in ('owner','admin')
  ) then return 'forbidden'; end if;
  if not exists (select 1 from public.enterprise_access_operations where id=p_operation_id and organization_id=p_organization_id)
    then return 'not_found'; end if;

  if p_action='cancel' then
    update public.enterprise_access_operations set status='cancelled',cancellation_reason=v_reason,cancelled_at=now(),lease_token=null,lease_expires_at=null,updated_at=now()
    where id=p_operation_id and organization_id=p_organization_id and status not in ('completed','cancelled');
  elsif p_action='pause' then
    update public.enterprise_access_operations set status='paused',lease_token=null,lease_expires_at=null,updated_at=now()
    where id=p_operation_id and organization_id=p_organization_id and status in ('pending','retry','processing');
  elsif p_action='resume' then
    update public.enterprise_access_operations set status='pending',available_at=now(),updated_at=now()
    where id=p_operation_id and organization_id=p_organization_id and status='paused';
  else
    update public.enterprise_access_operation_items set status='pending',error_detail=null,updated_at=now()
    where operation_id=p_operation_id and status='failed';
    update public.enterprise_access_operations set status='pending',available_at=now(),last_error_code=null,updated_at=now()
    where id=p_operation_id and organization_id=p_organization_id and status in ('retry','dead_letter','completed');
  end if;

  insert into public.enterprise_access_operation_events(operation_id,organization_id,actor_user_id,event_type,reason)
  values (p_operation_id,p_organization_id,p_actor_user_id,p_action,v_reason);
  return p_action || 'd';
end;
$$;

create or replace function public.export_enterprise_access_operation_members(p_operation_id uuid,p_organization_id uuid)
returns table (
  identity_id uuid,membership_id uuid,user_id uuid,department_key text,source_group_id uuid,
  previous_role text,requested_role text,previous_seat_type text,requested_seat_type text,
  status text,outcome_code text,attempt_count integer,completed_at timestamptz
)
language sql
security definer
set search_path = pg_catalog
stable
as $$
  select i.identity_id,i.membership_id,i.user_id,null::text,null::uuid,
         i.previous_role,i.requested_role,i.previous_seat_type,i.requested_seat_type,
         i.status,i.outcome_code,i.attempt_count,i.completed_at
  from public.enterprise_access_operation_items i
  join public.enterprise_access_operations o on o.id=i.operation_id
  where i.operation_id=p_operation_id and i.organization_id=p_organization_id and o.organization_id=p_organization_id
  order by i.identity_id;
$$;

-- ---------------------------------------------------------------------------
-- Runtime SLO snapshots and alerts. Canonical percentages are stored 0..100,
-- matching the UI contract; this replaces the historical 0..1/UI mismatch.
-- ---------------------------------------------------------------------------

create table if not exists public.enterprise_access_runtime_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  window_started_at timestamptz not null,
  window_ended_at timestamptz not null,
  operations_total integer not null default 0 check (operations_total>=0),
  operations_completed integer not null default 0 check (operations_completed>=0),
  operations_failed integer not null default 0 check (operations_failed>=0),
  dead_letter_count integer not null default 0 check (dead_letter_count>=0),
  processed_members integer not null default 0 check (processed_members>=0),
  failed_members integer not null default 0 check (failed_members>=0),
  compensated_members integer not null default 0 check (compensated_members>=0),
  p50_duration_ms integer,
  p95_duration_ms integer,
  oldest_pending_age_seconds integer not null default 0 check (oldest_pending_age_seconds>=0),
  success_rate numeric(7,4) check (success_rate is null or success_rate between 0 and 100),
  created_at timestamptz not null default now(),
  unique (organization_id,window_started_at,window_ended_at)
);
create index if not exists enterprise_access_runtime_snapshots_org_window_idx
  on public.enterprise_access_runtime_snapshots(organization_id,window_ended_at desc);

create table if not exists public.enterprise_access_runtime_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  alert_key text not null check (char_length(alert_key) between 3 and 120),
  alert_type text not null check (char_length(alert_type) between 3 and 200),
  severity text not null check (severity in ('warning','critical')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  details jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,alert_key,status) nulls not distinct
);
create index if not exists enterprise_access_runtime_alerts_open_idx
  on public.enterprise_access_runtime_alerts(organization_id,severity,last_seen_at desc)
  where status in ('open','acknowledged');

create table if not exists public.enterprise_access_export_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','expired','cancelled')),
  format text not null default 'csv' check (format in ('csv','jsonl')),
  filter jsonb not null default '{}'::jsonb,
  row_count integer not null default 0 check (row_count>=0),
  object_key text,
  sha256 text,
  byte_size bigint,
  expires_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  error_code text,
  download_count integer not null default 0 check (download_count>=0),
  last_downloaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists enterprise_access_export_jobs_claim_idx
  on public.enterprise_access_export_jobs(created_at asc) where status='pending';

create table if not exists public.enterprise_access_export_download_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  export_job_id uuid not null references public.enterprise_access_export_jobs(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  outcome text not null check (outcome in ('issued','denied','expired','integrity_failed','provider_failed')),
  reason_code text not null check (char_length(reason_code) between 3 and 120),
  expires_in_seconds integer check (expires_in_seconds between 30 and 900),
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index if not exists enterprise_access_export_download_events_org_created_idx
  on public.enterprise_access_export_download_events(organization_id,created_at desc);

alter table public.enterprise_access_runtime_snapshots enable row level security;
alter table public.enterprise_access_runtime_snapshots force row level security;
alter table public.enterprise_access_runtime_alerts enable row level security;
alter table public.enterprise_access_runtime_alerts force row level security;
alter table public.enterprise_access_export_jobs enable row level security;
alter table public.enterprise_access_export_jobs force row level security;
alter table public.enterprise_access_export_download_events enable row level security;
alter table public.enterprise_access_export_download_events force row level security;
revoke all on public.enterprise_access_runtime_snapshots from public,anon,authenticated;
revoke all on public.enterprise_access_runtime_alerts from public,anon,authenticated;
revoke all on public.enterprise_access_export_jobs from public,anon,authenticated;
revoke all on public.enterprise_access_export_download_events from public,anon,authenticated;
grant select,insert,update on public.enterprise_access_runtime_snapshots to service_role;
grant select,insert,update on public.enterprise_access_runtime_alerts to service_role;
grant select,insert,update on public.enterprise_access_export_jobs to service_role;
grant select,insert on public.enterprise_access_export_download_events to service_role;

create policy enterprise_access_runtime_snapshots_deny_delete on public.enterprise_access_runtime_snapshots for delete to authenticated using(false);
create policy enterprise_access_runtime_alerts_deny_delete on public.enterprise_access_runtime_alerts for delete to authenticated using(false);
create policy enterprise_access_export_jobs_deny_delete on public.enterprise_access_export_jobs for delete to authenticated using(false);
create policy enterprise_access_export_download_events_deny_delete on public.enterprise_access_export_download_events for delete to authenticated using(false);

create or replace function public.capture_enterprise_access_runtime_snapshot(p_organization_id uuid,p_window_minutes integer default 60)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_start timestamptz := now()-make_interval(mins=>least(greatest(coalesce(p_window_minutes,60),5),1440));
  v_end timestamptz := now();
  v_id uuid;
  v_total integer:=0; v_completed integer:=0; v_failed integer:=0; v_dead integer:=0;
  v_processed integer:=0; v_failed_members integer:=0; v_compensated integer:=0;
  v_p50 integer; v_p95 integer; v_oldest integer:=0; v_rate numeric(7,4);
begin
  if p_organization_id is null then raise exception 'organization_required'; end if;

  select count(*)::integer,
         count(*) filter(where status='completed')::integer,
         count(*) filter(where status in ('retry','dead_letter'))::integer,
         count(*) filter(where status='dead_letter')::integer,
         percentile_cont(0.5) within group(order by extract(epoch from (coalesce(completed_at,updated_at)-created_at))*1000)::integer,
         percentile_cont(0.95) within group(order by extract(epoch from (coalesce(completed_at,updated_at)-created_at))*1000)::integer
  into v_total,v_completed,v_failed,v_dead,v_p50,v_p95
  from public.enterprise_access_operations
  where organization_id=p_organization_id and created_at>=v_start;

  select count(*) filter(where status in ('succeeded','failed','skipped','compensated'))::integer,
         count(*) filter(where status='failed')::integer,
         count(*) filter(where status='compensated')::integer
  into v_processed,v_failed_members,v_compensated
  from public.enterprise_access_operation_items
  where organization_id=p_organization_id and updated_at>=v_start;

  select coalesce(extract(epoch from(now()-min(created_at)))::integer,0)
  into v_oldest from public.enterprise_access_operations
  where organization_id=p_organization_id and status in ('pending','processing','retry','paused');

  v_rate := case when v_total=0 then null else round((v_completed::numeric*100)/v_total::numeric,4) end;

  insert into public.enterprise_access_runtime_snapshots(
    organization_id,window_started_at,window_ended_at,operations_total,operations_completed,operations_failed,
    dead_letter_count,processed_members,failed_members,compensated_members,p50_duration_ms,p95_duration_ms,
    oldest_pending_age_seconds,success_rate
  ) values(
    p_organization_id,v_start,v_end,v_total,v_completed,v_failed,v_dead,v_processed,v_failed_members,v_compensated,
    v_p50,v_p95,v_oldest,v_rate
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.evaluate_enterprise_access_runtime_alerts(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_snapshot public.enterprise_access_runtime_snapshots%rowtype;
  v_count integer:=0; v_key text;
begin
  select * into v_snapshot from public.enterprise_access_runtime_snapshots
  where organization_id=p_organization_id order by window_ended_at desc limit 1;
  if not found then return 0; end if;

  if v_snapshot.dead_letter_count>0 then
    v_key:='dead-letter:'||to_char(v_snapshot.window_started_at,'YYYYMMDDHH24MI');
    insert into public.enterprise_access_runtime_alerts(organization_id,alert_key,alert_type,severity,details)
    values(p_organization_id,v_key,'Access operation dead-letter detected','critical',
      jsonb_build_object('deadLetterCount',v_snapshot.dead_letter_count,'windowEndedAt',v_snapshot.window_ended_at))
    on conflict(organization_id,alert_key,status) do update set last_seen_at=now(),details=excluded.details,updated_at=now();
    v_count:=v_count+1;
  end if;

  if v_snapshot.oldest_pending_age_seconds>=900 then
    v_key:='queue-lag:'||to_char(v_snapshot.window_started_at,'YYYYMMDDHH24MI');
    insert into public.enterprise_access_runtime_alerts(organization_id,alert_key,alert_type,severity,details)
    values(p_organization_id,v_key,'Access operation queue lag',
      case when v_snapshot.oldest_pending_age_seconds>=3600 then 'critical' else 'warning' end,
      jsonb_build_object('oldestPendingAgeSeconds',v_snapshot.oldest_pending_age_seconds))
    on conflict(organization_id,alert_key,status) do update set last_seen_at=now(),severity=excluded.severity,details=excluded.details,updated_at=now();
    v_count:=v_count+1;
  end if;

  if v_snapshot.operations_total>=5 and v_snapshot.success_rate is not null and v_snapshot.success_rate<95 then
    v_key:='success-rate:'||to_char(v_snapshot.window_started_at,'YYYYMMDDHH24MI');
    insert into public.enterprise_access_runtime_alerts(organization_id,alert_key,alert_type,severity,details)
    values(p_organization_id,v_key,'Access operation success rate degraded',
      case when v_snapshot.success_rate<80 then 'critical' else 'warning' end,
      jsonb_build_object('successRate',v_snapshot.success_rate,'operationsTotal',v_snapshot.operations_total))
    on conflict(organization_id,alert_key,status) do update set last_seen_at=now(),severity=excluded.severity,details=excluded.details,updated_at=now();
    v_count:=v_count+1;
  end if;
  return v_count;
end;
$$;

create or replace function public.acknowledge_enterprise_access_runtime_alert(p_organization_id uuid,p_alert_id uuid,p_actor_user_id uuid)
returns text language plpgsql security definer set search_path=pg_catalog as $$
begin
  update public.enterprise_access_runtime_alerts set status='acknowledged',acknowledged_at=now(),acknowledged_by=p_actor_user_id,updated_at=now()
  where organization_id=p_organization_id and id=p_alert_id and status='open';
  if not found then return 'not_found_or_not_open'; end if; return 'acknowledged';
end; $$;

create or replace function public.resolve_enterprise_access_runtime_alert(p_organization_id uuid,p_alert_id uuid,p_actor_user_id uuid,p_reason text)
returns text language plpgsql security definer set search_path=pg_catalog as $$
begin
  if char_length(trim(coalesce(p_reason,'')))<3 then return 'reason_required'; end if;
  update public.enterprise_access_runtime_alerts set status='resolved',resolved_at=now(),resolved_by=p_actor_user_id,
    resolution_reason=left(trim(p_reason),500),updated_at=now()
  where organization_id=p_organization_id and id=p_alert_id and status in ('open','acknowledged');
  if not found then return 'not_found_or_resolved'; end if; return 'resolved';
end; $$;

create or replace function public.enqueue_enterprise_access_export(p_organization_id uuid,p_requested_by uuid,p_format text,p_filter jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_id uuid;
begin
  if p_organization_id is null or p_requested_by is null or p_format not in ('csv','jsonl') then raise exception 'invalid_export_request'; end if;
  insert into public.enterprise_access_export_jobs(organization_id,requested_by,format,filter)
  values(p_organization_id,p_requested_by,p_format,coalesce(p_filter,'{}'::jsonb)) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.claim_enterprise_access_export_job()
returns table(job_id uuid,organization_id uuid,format text,filter jsonb,lease_token uuid)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_job public.enterprise_access_export_jobs%rowtype; v_token uuid:=gen_random_uuid();
begin
  select * into v_job from public.enterprise_access_export_jobs
  where status='pending' or(status='processing' and lease_expires_at<now())
  order by created_at asc for update skip locked limit 1;
  if not found then return; end if;
  update public.enterprise_access_export_jobs set status='processing',lease_token=v_token,lease_expires_at=now()+interval '15 minutes',updated_at=now()
  where id=v_job.id;
  return query select v_job.id,v_job.organization_id,v_job.format,v_job.filter,v_token;
end; $$;

create or replace function public.complete_enterprise_access_export_job(
  p_job_id uuid,p_lease_token uuid,p_object_key text,p_sha256 text,p_byte_size bigint,p_row_count integer
)
returns text language plpgsql security definer set search_path=pg_catalog as $$
begin
  if p_sha256 !~ '^[a-f0-9]{64}$' or coalesce(p_byte_size,-1)<0 or coalesce(p_row_count,-1)<0 then return 'invalid_output'; end if;
  update public.enterprise_access_export_jobs set status='completed',object_key=p_object_key,sha256=p_sha256,byte_size=p_byte_size,
    row_count=p_row_count,expires_at=now()+interval '24 hours',completed_at=now(),lease_token=null,lease_expires_at=null,updated_at=now()
  where id=p_job_id and status='processing' and lease_token=p_lease_token;
  if not found then return 'lease_mismatch'; end if; return 'completed';
end; $$;

create or replace function public.register_enterprise_access_export_download(
  p_organization_id uuid,p_export_job_id uuid,p_actor_user_id uuid,p_outcome text,p_reason_code text,
  p_expires_in_seconds integer default null,p_correlation_id uuid default gen_random_uuid()
)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare v_event_id uuid;
begin
  if p_outcome not in ('issued','denied','expired','integrity_failed','provider_failed') then raise exception 'invalid_download_outcome'; end if;
  if not exists(select 1 from public.enterprise_access_export_jobs where id=p_export_job_id and organization_id=p_organization_id) then raise exception 'export_job_not_found'; end if;
  insert into public.enterprise_access_export_download_events(organization_id,export_job_id,actor_user_id,outcome,reason_code,expires_in_seconds,correlation_id)
  values(p_organization_id,p_export_job_id,p_actor_user_id,p_outcome,left(p_reason_code,120),p_expires_in_seconds,coalesce(p_correlation_id,gen_random_uuid()))
  returning id into v_event_id;
  if p_outcome='issued' then
    update public.enterprise_access_export_jobs set download_count=download_count+1,last_downloaded_at=now(),updated_at=now()
    where id=p_export_job_id and organization_id=p_organization_id;
  end if;
  return v_event_id;
end; $$;

-- Private export bucket. Browser principals receive no bucket/object policy here;
-- signed downloads are issued only by the backend after tenant + step-up checks.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('enterprise-access-exports','enterprise-access-exports',false,52428800,array['text/csv','application/x-ndjson','application/json'])
on conflict(id) do update set public=false;

-- ---------------------------------------------------------------------------
-- Seat-contention evidence and current-contract wrapper. The wrapper delegates
-- actual capacity mutation to the V20 atomic licensing RPC, so there is one
-- canonical seat-limit authority.
-- ---------------------------------------------------------------------------

create table if not exists public.enterprise_seat_contention_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid references public.organization_members(id) on delete set null,
  requested_seat_type text not null check(requested_seat_type in ('full','participant','viewer')),
  outcome text not null check(outcome in ('reserved','capacity_exhausted','version_conflict','membership_not_found','contract_not_found')),
  contract_version integer,
  used_seats integer not null default 0 check(used_seats>=0),
  seat_limit integer not null default 0 check(seat_limit>=0),
  actor_user_id uuid references auth.users(id) on delete set null,
  correlation_id uuid not null default gen_random_uuid(),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists enterprise_seat_contention_events_org_created_idx
  on public.enterprise_seat_contention_events(organization_id,created_at desc);
alter table public.enterprise_seat_contention_events enable row level security;
alter table public.enterprise_seat_contention_events force row level security;
revoke all on public.enterprise_seat_contention_events from public,anon,authenticated;
grant select,insert on public.enterprise_seat_contention_events to service_role;
create policy enterprise_seat_contention_events_deny_delete on public.enterprise_seat_contention_events for delete to authenticated using(false);

create or replace function public.reserve_enterprise_seat_with_concurrency_guard(
  p_organization_id uuid,p_membership_id uuid,p_requested_seat_type text,
  p_expected_contract_version bigint,p_actor_user_id uuid,p_correlation_id uuid default gen_random_uuid()
)
returns table(outcome text,used_seats integer,seat_limit integer,contract_version bigint)
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_member public.organization_members%rowtype;
  v_contract public.enterprise_contracts%rowtype;
  v_result record;
  v_corr uuid:=coalesce(p_correlation_id,gen_random_uuid());
  v_outcome text;
begin
  if p_organization_id is null or p_membership_id is null or p_actor_user_id is null
     or p_requested_seat_type not in ('full','participant','viewer') then
    return query select 'membership_not_found'::text,0,0,0::bigint; return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text,0));
  select * into v_member from public.organization_members
  where organization_id=p_organization_id and id=p_membership_id and status='active' for update;
  if not found then
    insert into public.enterprise_seat_contention_events(organization_id,membership_id,requested_seat_type,outcome,actor_user_id,correlation_id)
    values(p_organization_id,null,p_requested_seat_type,'membership_not_found',p_actor_user_id,v_corr);
    return query select 'membership_not_found'::text,0,0,0::bigint; return;
  end if;

  select * into v_contract from public.enterprise_contracts
  where organization_id=p_organization_id
    and status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended')
  order by version desc,updated_at desc limit 1 for update;
  if not found then
    insert into public.enterprise_seat_contention_events(organization_id,membership_id,requested_seat_type,outcome,actor_user_id,correlation_id)
    values(p_organization_id,p_membership_id,p_requested_seat_type,'contract_not_found',p_actor_user_id,v_corr);
    return query select 'contract_not_found'::text,0,0,0::bigint; return;
  end if;

  if p_expected_contract_version is not null and v_contract.version<>p_expected_contract_version then
    insert into public.enterprise_seat_contention_events(organization_id,membership_id,requested_seat_type,outcome,contract_version,actor_user_id,correlation_id)
    values(p_organization_id,p_membership_id,p_requested_seat_type,'version_conflict',v_contract.version,p_actor_user_id,v_corr);
    return query select 'version_conflict'::text,0,0,v_contract.version::bigint; return;
  end if;

  select * into v_result from public.reserve_organization_seat_idempotent_atomic(
    p_organization_id,v_member.user_id,v_member.role,p_requested_seat_type,p_actor_user_id,
    'seat-contention:'||v_corr::text,'admin'
  );

  v_outcome:=case
    when v_result.outcome in ('reserved','already_active','seat_changed','duplicate') then 'reserved'
    when v_result.outcome in ('member_limit_reached','seat_limit_reached','admin_limit_reached') then 'capacity_exhausted'
    when v_result.outcome='contract_missing' then 'contract_not_found'
    else 'membership_not_found' end;

  insert into public.enterprise_seat_contention_events(
    organization_id,membership_id,requested_seat_type,outcome,contract_version,used_seats,seat_limit,actor_user_id,correlation_id,details
  ) values(
    p_organization_id,p_membership_id,p_requested_seat_type,v_outcome,v_contract.version,
    greatest(coalesce(v_result.seat_usage,0),0),greatest(coalesce(v_result.seat_limit,0),0),p_actor_user_id,v_corr,
    jsonb_build_object('licensingOutcome',v_result.outcome)
  );

  return query select v_outcome,greatest(coalesce(v_result.seat_usage,0),0),greatest(coalesce(v_result.seat_limit,0),0),v_contract.version::bigint;
end; $$;

-- Escalation queue for access alerts.
create table if not exists public.enterprise_access_escalation_policies (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  warning_after_minutes integer not null default 15 check(warning_after_minutes between 1 and 1440),
  critical_after_minutes integer not null default 60 check(critical_after_minutes between 5 and 10080),
  email_enabled boolean not null default true,
  webhook_enabled boolean not null default false,
  version bigint not null default 1 check(version>0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check(critical_after_minutes>warning_after_minutes)
);
create table if not exists public.enterprise_access_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  alert_key text not null,
  channel text not null check(channel in ('email','webhook','in_app')),
  severity text not null check(severity in ('warning','critical')),
  status text not null default 'pending' check(status in ('pending','processing','retry','delivered','dead_letter','cancelled')),
  attempt_count integer not null default 0 check(attempt_count between 0 and 10),
  available_at timestamptz not null default now(),
  lease_token uuid,lease_expires_at timestamptz,
  payload jsonb not null default '{}'::jsonb,last_error_code text,delivered_at timestamptz,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(organization_id,alert_key,channel)
);
create index if not exists enterprise_access_notifications_ready_idx on public.enterprise_access_notifications(available_at,created_at) where status in ('pending','retry');
alter table public.enterprise_access_escalation_policies enable row level security;
alter table public.enterprise_access_escalation_policies force row level security;
alter table public.enterprise_access_notifications enable row level security;
alter table public.enterprise_access_notifications force row level security;
revoke all on public.enterprise_access_escalation_policies from public,anon,authenticated;
revoke all on public.enterprise_access_notifications from public,anon,authenticated;
grant select,insert,update on public.enterprise_access_escalation_policies to service_role;
grant select,insert,update on public.enterprise_access_notifications to service_role;
create policy enterprise_access_notifications_deny_delete on public.enterprise_access_notifications for delete to authenticated using(false);

create or replace function public.enqueue_enterprise_access_escalations()
returns integer language plpgsql security definer set search_path=pg_catalog as $$
declare v_count integer:=0;
begin
  insert into public.enterprise_access_notifications(organization_id,alert_key,channel,severity,payload)
  select a.organization_id,a.alert_key,
         case when coalesce(p.webhook_enabled,false) then 'webhook' else 'email' end,
         a.severity,jsonb_build_object('alertId',a.id,'alertKey',a.alert_key,'severity',a.severity)
  from public.enterprise_access_runtime_alerts a
  left join public.enterprise_access_escalation_policies p on p.organization_id=a.organization_id
  where a.status='open'
  on conflict(organization_id,alert_key,channel) do nothing;
  get diagnostics v_count=row_count; return v_count;
end; $$;

create or replace function public.claim_enterprise_access_notification()
returns table(notification_id uuid,organization_id uuid,channel text,payload jsonb,lease_token uuid)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_row public.enterprise_access_notifications%rowtype; v_token uuid:=gen_random_uuid();
begin
  select * into v_row from public.enterprise_access_notifications
  where(status in ('pending','retry') and available_at<=now()) or(status='processing' and lease_expires_at<now())
  order by available_at,created_at for update skip locked limit 1;
  if not found then return; end if;
  update public.enterprise_access_notifications set status='processing',attempt_count=attempt_count+1,lease_token=v_token,
    lease_expires_at=now()+interval '10 minutes',updated_at=now() where id=v_row.id;
  return query select v_row.id,v_row.organization_id,v_row.channel,v_row.payload,v_token;
end; $$;

create or replace function public.complete_enterprise_access_notification(
  p_notification_id uuid,p_lease_token uuid,p_delivered boolean,p_error_code text default null
)
returns text language plpgsql security definer set search_path=pg_catalog as $$
declare v_attempts integer;
begin
  select attempt_count into v_attempts from public.enterprise_access_notifications
  where id=p_notification_id and status='processing' and lease_token=p_lease_token for update;
  if not found then return 'lease_mismatch'; end if;
  update public.enterprise_access_notifications
  set status=case when p_delivered then 'delivered' when v_attempts>=5 then 'dead_letter' else 'retry' end,
      available_at=case when p_delivered or v_attempts>=5 then available_at else now()+make_interval(secs=>least(3600,30*power(2,greatest(v_attempts-1,0))::integer)) end,
      last_error_code=case when p_delivered then null else left(coalesce(nullif(trim(p_error_code),''),'delivery_failed'),120) end,
      delivered_at=case when p_delivered then now() else delivered_at end,
      lease_token=null,lease_expires_at=null,updated_at=now()
  where id=p_notification_id;
  return case when p_delivered then 'delivered' when v_attempts>=5 then 'dead_letter' else 'retry' end;
end; $$;

-- ---------------------------------------------------------------------------
-- Function privileges: backend-only. Browser access is always through routes
-- that derive tenant membership and enforce RBAC/step-up.
-- ---------------------------------------------------------------------------

revoke all on function public.create_enterprise_access_operation(uuid,text,uuid,text,integer) from public,anon,authenticated;
revoke all on function public.seed_enterprise_access_operation_items(uuid,integer) from public,anon,authenticated;
revoke all on function public.claim_enterprise_access_operation() from public,anon,authenticated;
revoke all on function public.claim_enterprise_access_operation_item(uuid,uuid) from public,anon,authenticated;
revoke all on function public.finish_enterprise_access_operation_item(uuid,uuid,text,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.finalize_enterprise_access_operation(uuid,uuid) from public,anon,authenticated;
revoke all on function public.control_enterprise_access_operation(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.export_enterprise_access_operation_members(uuid,uuid) from public,anon,authenticated;
revoke all on function public.capture_enterprise_access_runtime_snapshot(uuid,integer) from public,anon,authenticated;
revoke all on function public.evaluate_enterprise_access_runtime_alerts(uuid) from public,anon,authenticated;
revoke all on function public.acknowledge_enterprise_access_runtime_alert(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.resolve_enterprise_access_runtime_alert(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.enqueue_enterprise_access_export(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.claim_enterprise_access_export_job() from public,anon,authenticated;
revoke all on function public.complete_enterprise_access_export_job(uuid,uuid,text,text,bigint,integer) from public,anon,authenticated;
revoke all on function public.register_enterprise_access_export_download(uuid,uuid,uuid,text,text,integer,uuid) from public,anon,authenticated;
revoke all on function public.reserve_enterprise_seat_with_concurrency_guard(uuid,uuid,text,bigint,uuid,uuid) from public,anon,authenticated;
revoke all on function public.enqueue_enterprise_access_escalations() from public,anon,authenticated;
revoke all on function public.claim_enterprise_access_notification() from public,anon,authenticated;
revoke all on function public.complete_enterprise_access_notification(uuid,uuid,boolean,text) from public,anon,authenticated;

grant execute on function public.create_enterprise_access_operation(uuid,text,uuid,text,integer) to service_role;
grant execute on function public.seed_enterprise_access_operation_items(uuid,integer) to service_role;
grant execute on function public.claim_enterprise_access_operation() to service_role;
grant execute on function public.claim_enterprise_access_operation_item(uuid,uuid) to service_role;
grant execute on function public.finish_enterprise_access_operation_item(uuid,uuid,text,text,jsonb,text) to service_role;
grant execute on function public.finalize_enterprise_access_operation(uuid,uuid) to service_role;
grant execute on function public.control_enterprise_access_operation(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.export_enterprise_access_operation_members(uuid,uuid) to service_role;
grant execute on function public.capture_enterprise_access_runtime_snapshot(uuid,integer) to service_role;
grant execute on function public.evaluate_enterprise_access_runtime_alerts(uuid) to service_role;
grant execute on function public.acknowledge_enterprise_access_runtime_alert(uuid,uuid,uuid) to service_role;
grant execute on function public.resolve_enterprise_access_runtime_alert(uuid,uuid,uuid,text) to service_role;
grant execute on function public.enqueue_enterprise_access_export(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.claim_enterprise_access_export_job() to service_role;
grant execute on function public.complete_enterprise_access_export_job(uuid,uuid,text,text,bigint,integer) to service_role;
grant execute on function public.register_enterprise_access_export_download(uuid,uuid,uuid,text,text,integer,uuid) to service_role;
grant execute on function public.reserve_enterprise_seat_with_concurrency_guard(uuid,uuid,text,bigint,uuid,uuid) to service_role;
grant execute on function public.enqueue_enterprise_access_escalations() to service_role;
grant execute on function public.claim_enterprise_access_notification() to service_role;
grant execute on function public.complete_enterprise_access_notification(uuid,uuid,boolean,text) to service_role;

-- Deterministic postconditions for the forward reconciliation itself.
do $verify$
declare
  forced_count integer;
  browser_grants integer;
  bad_functions integer;
begin
  select count(*) into forced_count
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in (
      'enterprise_access_operations','enterprise_access_operation_items','enterprise_access_operation_events',
      'enterprise_access_runtime_snapshots','enterprise_access_runtime_alerts','enterprise_access_export_jobs',
      'enterprise_access_export_download_events','enterprise_seat_contention_events',
      'enterprise_access_escalation_policies','enterprise_access_notifications'
    ) and c.relrowsecurity and c.relforcerowsecurity;
  if forced_count<>10 then raise exception 'trusted access runtime RLS/FORCE RLS incomplete'; end if;

  select count(*) into browser_grants from information_schema.role_table_grants
  where table_schema='public'
    and table_name in (
      'enterprise_access_operations','enterprise_access_operation_items','enterprise_access_operation_events',
      'enterprise_access_runtime_snapshots','enterprise_access_runtime_alerts','enterprise_access_export_jobs',
      'enterprise_access_export_download_events','enterprise_seat_contention_events',
      'enterprise_access_escalation_policies','enterprise_access_notifications'
    ) and grantee in ('anon','authenticated');
  if browser_grants<>0 then raise exception 'browser roles retain trusted access control-plane privileges'; end if;

  select count(*) into bad_functions from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in (
      'create_enterprise_access_operation','seed_enterprise_access_operation_items','claim_enterprise_access_operation',
      'claim_enterprise_access_operation_item','finish_enterprise_access_operation_item','finalize_enterprise_access_operation',
      'control_enterprise_access_operation','export_enterprise_access_operation_members','capture_enterprise_access_runtime_snapshot',
      'evaluate_enterprise_access_runtime_alerts','acknowledge_enterprise_access_runtime_alert','resolve_enterprise_access_runtime_alert',
      'enqueue_enterprise_access_export','claim_enterprise_access_export_job','complete_enterprise_access_export_job',
      'register_enterprise_access_export_download','reserve_enterprise_seat_with_concurrency_guard',
      'enqueue_enterprise_access_escalations','claim_enterprise_access_notification','complete_enterprise_access_notification'
    ) and has_function_privilege('authenticated',p.oid,'EXECUTE');
  if bad_functions<>0 then raise exception 'authenticated retains trusted access function execute privilege'; end if;

  if not exists(select 1 from storage.buckets where id='enterprise-access-exports' and public=false) then
    raise exception 'private enterprise access export bucket missing';
  end if;
end
$verify$;

commit;
