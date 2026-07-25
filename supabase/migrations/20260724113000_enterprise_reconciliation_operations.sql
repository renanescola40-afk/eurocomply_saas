begin;

create index if not exists enterprise_group_access_jobs_status_schedule_idx
  on public.enterprise_group_access_reconciliation_jobs (status, available_at, created_at);

create or replace function public.enterprise_group_access_reconciliation_status()
returns table (
  pending bigint,
  processing bigint,
  retrying bigint,
  dead_letter bigint,
  completed_24h bigint,
  oldest_pending_age_seconds bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    count(*) filter (where status = 'pending'),
    count(*) filter (where status = 'processing'),
    count(*) filter (where status = 'retry'),
    count(*) filter (where status = 'dead_letter'),
    count(*) filter (where status = 'completed' and completed_at >= now() - interval '24 hours'),
    coalesce(extract(epoch from now() - min(created_at) filter (where status in ('pending','retry')))::bigint, 0)
  from public.enterprise_group_access_reconciliation_jobs;
$$;

create or replace function public.replay_enterprise_group_access_dead_letter_job(
  p_job_id uuid,
  p_organization_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.enterprise_group_access_reconciliation_jobs
  set status = 'pending',
      attempts = 0,
      available_at = now(),
      lease_token = null,
      lease_expires_at = null,
      last_error_code = null,
      updated_at = now()
  where id = p_job_id
    and organization_id = p_organization_id
    and status = 'dead_letter';

  if not found then return 'not_found'; end if;
  return 'replayed';
end;
$$;

create or replace function public.prune_enterprise_group_access_reconciliation_jobs(
  p_retention_days integer default 30
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.enterprise_group_access_reconciliation_jobs
  where status = 'completed'
    and completed_at < now() - make_interval(days => least(greatest(coalesce(p_retention_days, 30), 7), 365));
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.enterprise_group_access_reconciliation_status() from public, anon, authenticated;
revoke all on function public.replay_enterprise_group_access_dead_letter_job(uuid, uuid) from public, anon, authenticated;
revoke all on function public.prune_enterprise_group_access_reconciliation_jobs(integer) from public, anon, authenticated;
grant execute on function public.enterprise_group_access_reconciliation_status() to service_role;
grant execute on function public.replay_enterprise_group_access_dead_letter_job(uuid, uuid) to service_role;
grant execute on function public.prune_enterprise_group_access_reconciliation_jobs(integer) to service_role;

commit;
