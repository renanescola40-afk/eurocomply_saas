begin;

create table if not exists public.enterprise_group_access_reconciliation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','retry','completed','dead_letter')),
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 8),
  max_attempts integer not null default 5 check (max_attempts between 1 and 8),
  batch_size integer not null default 100 check (batch_size between 1 and 500),
  available_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  lease_token uuid,
  last_error_code text,
  processed_count integer not null default 0 check (processed_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, status) nulls not distinct
);

create index if not exists enterprise_group_access_jobs_ready_idx
  on public.enterprise_group_access_reconciliation_jobs (available_at, created_at)
  where status in ('pending','retry');

alter table public.enterprise_group_access_reconciliation_jobs enable row level security;
alter table public.enterprise_group_access_reconciliation_jobs force row level security;
revoke all on public.enterprise_group_access_reconciliation_jobs from public, anon, authenticated;
grant all on public.enterprise_group_access_reconciliation_jobs to service_role;

-- The queue is service-role only. Keep the denied DELETE operation explicit so
-- repository RLS coverage remains fail-closed and future grants cannot expose
-- destructive access to authenticated users.
drop policy if exists enterprise_group_access_reconciliation_jobs_deny_delete
  on public.enterprise_group_access_reconciliation_jobs;
create policy enterprise_group_access_reconciliation_jobs_deny_delete
  on public.enterprise_group_access_reconciliation_jobs
  for delete
  to authenticated
  using (false);

create or replace function public.enqueue_enterprise_group_access_reconciliation(
  p_organization_id uuid,
  p_batch_size integer default 100
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  if p_organization_id is null then
    raise exception 'organization_required';
  end if;

  insert into public.enterprise_group_access_reconciliation_jobs (
    organization_id,
    status,
    batch_size,
    available_at
  ) values (
    p_organization_id,
    'pending',
    least(greatest(coalesce(p_batch_size, 100), 1), 500),
    now()
  )
  on conflict (organization_id, status) do update
  set batch_size = excluded.batch_size,
      available_at = least(public.enterprise_group_access_reconciliation_jobs.available_at, now()),
      updated_at = now()
  returning id into v_job_id;

  return v_job_id;
end;
$$;

create or replace function public.claim_enterprise_group_access_reconciliation_job()
returns table (
  job_id uuid,
  organization_id uuid,
  batch_size integer,
  lease_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.enterprise_group_access_reconciliation_jobs%rowtype;
  v_token uuid := gen_random_uuid();
begin
  select * into v_job
  from public.enterprise_group_access_reconciliation_jobs
  where (
    status in ('pending','retry') and available_at <= now()
  ) or (
    status = 'processing' and lease_expires_at < now()
  )
  order by available_at asc, created_at asc
  for update skip locked
  limit 1;

  if not found then return; end if;

  update public.enterprise_group_access_reconciliation_jobs
  set status = 'processing',
      attempts = attempts + 1,
      lease_token = v_token,
      lease_expires_at = now() + interval '10 minutes',
      updated_at = now()
  where id = v_job.id;

  return query select v_job.id, v_job.organization_id, v_job.batch_size, v_token;
end;
$$;

create or replace function public.complete_enterprise_group_access_reconciliation_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_processed_count integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.enterprise_group_access_reconciliation_jobs
  set status = 'completed',
      processed_count = greatest(coalesce(p_processed_count, 0), 0),
      lease_token = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
  where id = p_job_id
    and status = 'processing'
    and lease_token = p_lease_token;

  if not found then return 'lease_mismatch'; end if;
  return 'completed';
end;
$$;

create or replace function public.fail_enterprise_group_access_reconciliation_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_error_code text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
  v_max_attempts integer;
begin
  select attempts, max_attempts into v_attempts, v_max_attempts
  from public.enterprise_group_access_reconciliation_jobs
  where id = p_job_id
    and status = 'processing'
    and lease_token = p_lease_token
  for update;

  if not found then return 'lease_mismatch'; end if;

  update public.enterprise_group_access_reconciliation_jobs
  set status = case when v_attempts >= v_max_attempts then 'dead_letter' else 'retry' end,
      available_at = case
        when v_attempts >= v_max_attempts then available_at
        else now() + make_interval(secs => least(3600, 30 * power(2, greatest(v_attempts - 1, 0))::integer))
      end,
      last_error_code = left(coalesce(nullif(trim(p_error_code), ''), 'unknown_error'), 120),
      lease_token = null,
      lease_expires_at = null,
      updated_at = now()
  where id = p_job_id;

  return case when v_attempts >= v_max_attempts then 'dead_letter' else 'retry' end;
end;
$$;

revoke all on function public.enqueue_enterprise_group_access_reconciliation(uuid, integer) from public, anon, authenticated;
revoke all on function public.claim_enterprise_group_access_reconciliation_job() from public, anon, authenticated;
revoke all on function public.complete_enterprise_group_access_reconciliation_job(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.fail_enterprise_group_access_reconciliation_job(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.enqueue_enterprise_group_access_reconciliation(uuid, integer) to service_role;
grant execute on function public.claim_enterprise_group_access_reconciliation_job() to service_role;
grant execute on function public.complete_enterprise_group_access_reconciliation_job(uuid, uuid, integer) to service_role;
grant execute on function public.fail_enterprise_group_access_reconciliation_job(uuid, uuid, text) to service_role;

commit;
