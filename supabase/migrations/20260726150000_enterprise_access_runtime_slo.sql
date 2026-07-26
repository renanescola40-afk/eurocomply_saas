begin;

create table if not exists public.enterprise_access_runtime_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  window_started_at timestamptz not null,
  window_ended_at timestamptz not null,
  operations_total integer not null default 0 check (operations_total >= 0),
  operations_completed integer not null default 0 check (operations_completed >= 0),
  operations_failed integer not null default 0 check (operations_failed >= 0),
  operations_dead_letter integer not null default 0 check (operations_dead_letter >= 0),
  members_processed integer not null default 0 check (members_processed >= 0),
  members_failed integer not null default 0 check (members_failed >= 0),
  members_compensated integer not null default 0 check (members_compensated >= 0),
  p50_duration_ms integer,
  p95_duration_ms integer,
  oldest_pending_seconds integer not null default 0 check (oldest_pending_seconds >= 0),
  success_rate numeric(7,4) not null default 1 check (success_rate between 0 and 1),
  created_at timestamptz not null default now(),
  unique (organization_id, window_started_at, window_ended_at)
);

create index if not exists enterprise_access_runtime_snapshots_org_window_idx
  on public.enterprise_access_runtime_snapshots (organization_id, window_ended_at desc);

create table if not exists public.enterprise_access_runtime_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  alert_key text not null check (char_length(alert_key) between 3 and 120),
  severity text not null check (severity in ('warning','critical')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  title text not null check (char_length(title) between 3 and 200),
  summary text not null check (char_length(summary) between 3 and 1000),
  evidence jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, alert_key, status) nulls not distinct
);

create index if not exists enterprise_access_runtime_alerts_open_idx
  on public.enterprise_access_runtime_alerts (severity, last_seen_at desc)
  where status in ('open','acknowledged');

create table if not exists public.enterprise_access_export_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','expired','cancelled')),
  format text not null default 'csv' check (format in ('csv','jsonl')),
  filter jsonb not null default '{}'::jsonb,
  row_count integer not null default 0 check (row_count >= 0),
  object_key text,
  sha256 text,
  byte_size bigint,
  expires_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists enterprise_access_export_jobs_claim_idx
  on public.enterprise_access_export_jobs (created_at asc)
  where status = 'pending';

alter table public.enterprise_access_runtime_snapshots enable row level security;
alter table public.enterprise_access_runtime_snapshots force row level security;
alter table public.enterprise_access_runtime_alerts enable row level security;
alter table public.enterprise_access_runtime_alerts force row level security;
alter table public.enterprise_access_export_jobs enable row level security;
alter table public.enterprise_access_export_jobs force row level security;

revoke all on public.enterprise_access_runtime_snapshots from public, anon, authenticated;
revoke all on public.enterprise_access_runtime_alerts from public, anon, authenticated;
revoke all on public.enterprise_access_export_jobs from public, anon, authenticated;
grant all on public.enterprise_access_runtime_snapshots to service_role;
grant all on public.enterprise_access_runtime_alerts to service_role;
grant all on public.enterprise_access_export_jobs to service_role;

create policy enterprise_access_runtime_snapshots_deny_delete
  on public.enterprise_access_runtime_snapshots for delete to authenticated using (false);
create policy enterprise_access_runtime_alerts_deny_delete
  on public.enterprise_access_runtime_alerts for delete to authenticated using (false);
create policy enterprise_access_export_jobs_deny_delete
  on public.enterprise_access_export_jobs for delete to authenticated using (false);

create or replace function public.capture_enterprise_access_runtime_snapshot(
  p_organization_id uuid,
  p_window_minutes integer default 60
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := now() - make_interval(mins => least(greatest(coalesce(p_window_minutes, 60), 5), 1440));
  v_end timestamptz := now();
  v_id uuid;
  v_operations_total integer := 0;
  v_operations_completed integer := 0;
  v_operations_failed integer := 0;
  v_operations_dead_letter integer := 0;
  v_members_processed integer := 0;
  v_members_failed integer := 0;
  v_members_compensated integer := 0;
  v_p50 integer;
  v_p95 integer;
  v_oldest integer := 0;
  v_rate numeric(7,4) := 1;
begin
  if p_organization_id is null then raise exception 'organization_required'; end if;

  select
    count(*),
    count(*) filter (where status = 'completed'),
    count(*) filter (where status in ('failed','dead_letter')),
    count(*) filter (where status = 'dead_letter'),
    coalesce(sum(processed_count), 0),
    coalesce(sum(failed_count), 0),
    coalesce(sum(compensated_count), 0),
    percentile_cont(0.5) within group (order by extract(epoch from (coalesce(completed_at, updated_at) - created_at)) * 1000)::integer,
    percentile_cont(0.95) within group (order by extract(epoch from (coalesce(completed_at, updated_at) - created_at)) * 1000)::integer
  into v_operations_total, v_operations_completed, v_operations_failed, v_operations_dead_letter,
       v_members_processed, v_members_failed, v_members_compensated, v_p50, v_p95
  from public.enterprise_access_operation_runs r
  where r.organization_id = p_organization_id and r.created_at >= v_start;

  select coalesce(extract(epoch from (now() - min(created_at)))::integer, 0)
  into v_oldest
  from public.enterprise_access_operation_runs r
  where r.organization_id = p_organization_id and r.status in ('pending','processing','retry','paused');

  if v_operations_total > 0 then
    v_rate := round(v_operations_completed::numeric / v_operations_total::numeric, 4);
  end if;

  insert into public.enterprise_access_runtime_snapshots (
    organization_id, window_started_at, window_ended_at,
    operations_total, operations_completed, operations_failed, operations_dead_letter,
    members_processed, members_failed, members_compensated,
    p50_duration_ms, p95_duration_ms, oldest_pending_seconds, success_rate
  ) values (
    p_organization_id, v_start, v_end,
    v_operations_total, v_operations_completed, v_operations_failed, v_operations_dead_letter,
    v_members_processed, v_members_failed, v_members_compensated,
    v_p50, v_p95, v_oldest, v_rate
  )
  on conflict (organization_id, window_started_at, window_ended_at) do update
  set operations_total = excluded.operations_total,
      operations_completed = excluded.operations_completed,
      operations_failed = excluded.operations_failed,
      operations_dead_letter = excluded.operations_dead_letter,
      members_processed = excluded.members_processed,
      members_failed = excluded.members_failed,
      members_compensated = excluded.members_compensated,
      p50_duration_ms = excluded.p50_duration_ms,
      p95_duration_ms = excluded.p95_duration_ms,
      oldest_pending_seconds = excluded.oldest_pending_seconds,
      success_rate = excluded.success_rate
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.evaluate_enterprise_access_runtime_alerts(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot public.enterprise_access_runtime_snapshots%rowtype;
  v_count integer := 0;
  v_key text;
begin
  select * into v_snapshot
  from public.enterprise_access_runtime_snapshots
  where organization_id = p_organization_id
  order by window_ended_at desc limit 1;
  if not found then return 0; end if;

  if v_snapshot.operations_dead_letter > 0 then
    v_key := 'dead-letter:' || to_char(v_snapshot.window_started_at, 'YYYYMMDDHH24MI');
    insert into public.enterprise_access_runtime_alerts (
      organization_id, alert_key, severity, title, summary, evidence
    ) values (
      p_organization_id, v_key, 'critical', 'Access operation dead-letter detected',
      'One or more access operations exhausted automatic retries.',
      jsonb_build_object('deadLetter', v_snapshot.operations_dead_letter, 'windowEndedAt', v_snapshot.window_ended_at)
    ) on conflict (organization_id, alert_key, status) do update
      set last_seen_at = now(), evidence = excluded.evidence, updated_at = now();
    v_count := v_count + 1;
  end if;

  if v_snapshot.oldest_pending_seconds >= 900 then
    v_key := 'queue-lag:' || to_char(v_snapshot.window_started_at, 'YYYYMMDDHH24MI');
    insert into public.enterprise_access_runtime_alerts (
      organization_id, alert_key, severity, title, summary, evidence
    ) values (
      p_organization_id, v_key,
      case when v_snapshot.oldest_pending_seconds >= 3600 then 'critical' else 'warning' end,
      'Access operation queue lag',
      'The oldest pending access operation exceeded the queue latency objective.',
      jsonb_build_object('oldestPendingSeconds', v_snapshot.oldest_pending_seconds)
    ) on conflict (organization_id, alert_key, status) do update
      set last_seen_at = now(), severity = excluded.severity, evidence = excluded.evidence, updated_at = now();
    v_count := v_count + 1;
  end if;

  if v_snapshot.operations_total >= 5 and v_snapshot.success_rate < 0.95 then
    v_key := 'success-rate:' || to_char(v_snapshot.window_started_at, 'YYYYMMDDHH24MI');
    insert into public.enterprise_access_runtime_alerts (
      organization_id, alert_key, severity, title, summary, evidence
    ) values (
      p_organization_id, v_key,
      case when v_snapshot.success_rate < 0.80 then 'critical' else 'warning' end,
      'Access operation success rate degraded',
      'Access operation completion rate fell below the runtime objective.',
      jsonb_build_object('successRate', v_snapshot.success_rate, 'operationsTotal', v_snapshot.operations_total)
    ) on conflict (organization_id, alert_key, status) do update
      set last_seen_at = now(), severity = excluded.severity, evidence = excluded.evidence, updated_at = now();
    v_count := v_count + 1;
  end if;

  return v_count;
end;
$$;

create or replace function public.acknowledge_enterprise_access_runtime_alert(
  p_organization_id uuid,
  p_alert_id uuid,
  p_actor_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.enterprise_access_runtime_alerts
  set status = 'acknowledged', acknowledged_at = now(), acknowledged_by = p_actor_user_id, updated_at = now()
  where organization_id = p_organization_id and id = p_alert_id and status = 'open';
  if not found then return 'not_found_or_not_open'; end if;
  return 'acknowledged';
end;
$$;

create or replace function public.resolve_enterprise_access_runtime_alert(
  p_organization_id uuid,
  p_alert_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if char_length(trim(coalesce(p_reason, ''))) < 3 then return 'reason_required'; end if;
  update public.enterprise_access_runtime_alerts
  set status = 'resolved', resolved_at = now(), resolved_by = p_actor_user_id,
      resolution_reason = left(trim(p_reason), 500), updated_at = now()
  where organization_id = p_organization_id and id = p_alert_id and status in ('open','acknowledged');
  if not found then return 'not_found_or_resolved'; end if;
  return 'resolved';
end;
$$;

create or replace function public.enqueue_enterprise_access_export(
  p_organization_id uuid,
  p_requested_by uuid,
  p_format text,
  p_filter jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_organization_id is null or p_format not in ('csv','jsonl') then raise exception 'invalid_export_request'; end if;
  insert into public.enterprise_access_export_jobs (organization_id, requested_by, format, filter)
  values (p_organization_id, p_requested_by, p_format, coalesce(p_filter, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.claim_enterprise_access_export_job()
returns table (job_id uuid, organization_id uuid, format text, filter jsonb, lease_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare v_job public.enterprise_access_export_jobs%rowtype; v_token uuid := gen_random_uuid();
begin
  select * into v_job from public.enterprise_access_export_jobs
  where status = 'pending' or (status = 'processing' and lease_expires_at < now())
  order by created_at asc for update skip locked limit 1;
  if not found then return; end if;
  update public.enterprise_access_export_jobs
  set status = 'processing', lease_token = v_token, lease_expires_at = now() + interval '15 minutes', updated_at = now()
  where id = v_job.id;
  return query select v_job.id, v_job.organization_id, v_job.format, v_job.filter, v_token;
end;
$$;

create or replace function public.complete_enterprise_access_export_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_object_key text,
  p_sha256 text,
  p_byte_size bigint,
  p_row_count integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sha256 !~ '^[a-f0-9]{64}$' or coalesce(p_byte_size, -1) < 0 or coalesce(p_row_count, -1) < 0 then return 'invalid_output'; end if;
  update public.enterprise_access_export_jobs
  set status = 'completed', object_key = p_object_key, sha256 = p_sha256, byte_size = p_byte_size,
      row_count = p_row_count, expires_at = now() + interval '24 hours', completed_at = now(),
      lease_token = null, lease_expires_at = null, updated_at = now()
  where id = p_job_id and status = 'processing' and lease_token = p_lease_token;
  if not found then return 'lease_mismatch'; end if;
  return 'completed';
end;
$$;

revoke all on function public.capture_enterprise_access_runtime_snapshot(uuid, integer) from public, anon, authenticated;
revoke all on function public.evaluate_enterprise_access_runtime_alerts(uuid) from public, anon, authenticated;
revoke all on function public.acknowledge_enterprise_access_runtime_alert(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.resolve_enterprise_access_runtime_alert(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.enqueue_enterprise_access_export(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.claim_enterprise_access_export_job() from public, anon, authenticated;
revoke all on function public.complete_enterprise_access_export_job(uuid, uuid, text, text, bigint, integer) from public, anon, authenticated;
grant execute on function public.capture_enterprise_access_runtime_snapshot(uuid, integer) to service_role;
grant execute on function public.evaluate_enterprise_access_runtime_alerts(uuid) to service_role;
grant execute on function public.acknowledge_enterprise_access_runtime_alert(uuid, uuid, uuid) to service_role;
grant execute on function public.resolve_enterprise_access_runtime_alert(uuid, uuid, uuid, text) to service_role;
grant execute on function public.enqueue_enterprise_access_export(uuid, uuid, text, jsonb) to service_role;
grant execute on function public.claim_enterprise_access_export_job() to service_role;
grant execute on function public.complete_enterprise_access_export_job(uuid, uuid, text, text, bigint, integer) to service_role;

commit;
