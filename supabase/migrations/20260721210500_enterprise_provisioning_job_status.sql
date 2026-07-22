begin;

create or replace function public.get_enterprise_provisioning_job_status(
  p_job_id uuid,
  p_actor_user_id uuid
)
returns table (
  outcome text,
  job_id uuid,
  organization_id uuid,
  source text,
  job_status text,
  total_items integer,
  processed_items integer,
  succeeded_items integer,
  failed_items integer,
  queued_items integer,
  processing_items integer,
  created_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  recent_errors jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.enterprise_provisioning_jobs%rowtype;
begin
  select job.* into v_job
  from public.enterprise_provisioning_jobs as job
  where job.id = p_job_id;

  if not found then
    return query select
      'not_found'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      0, 0, 0, 0, 0, 0,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz,
      '[]'::jsonb;
    return;
  end if;

  if not public.can_operate_enterprise_provisioning(v_job.organization_id, p_actor_user_id) then
    return query select
      'operator_required'::text,
      v_job.id,
      v_job.organization_id,
      v_job.source,
      v_job.status,
      v_job.total_items,
      v_job.processed_items,
      v_job.succeeded_items,
      v_job.failed_items,
      0, 0,
      v_job.created_at,
      v_job.started_at,
      v_job.completed_at,
      '[]'::jsonb;
    return;
  end if;

  return query
  select
    'resolved'::text,
    v_job.id,
    v_job.organization_id,
    v_job.source,
    v_job.status,
    v_job.total_items,
    v_job.processed_items,
    v_job.succeeded_items,
    v_job.failed_items,
    count(*) filter (where item.status = 'queued')::integer,
    count(*) filter (where item.status = 'processing')::integer,
    v_job.created_at,
    v_job.started_at,
    v_job.completed_at,
    coalesce((
      select jsonb_agg(error_item order by error_item.row_number)
      from (
        select
          failed_item.row_number,
          failed_item.error_code,
          failed_item.attempt_count
        from public.enterprise_provisioning_job_items as failed_item
        where failed_item.job_id = v_job.id
          and failed_item.error_code is not null
        order by failed_item.updated_at desc
        limit 100
      ) as error_item
    ), '[]'::jsonb)
  from public.enterprise_provisioning_job_items as item
  where item.job_id = v_job.id
  group by
    v_job.id,
    v_job.organization_id,
    v_job.source,
    v_job.status,
    v_job.total_items,
    v_job.processed_items,
    v_job.succeeded_items,
    v_job.failed_items,
    v_job.created_at,
    v_job.started_at,
    v_job.completed_at;
end;
$$;

revoke all on function public.get_enterprise_provisioning_job_status(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_enterprise_provisioning_job_status(uuid, uuid) to service_role;

notify pgrst, 'reload schema';

commit;
