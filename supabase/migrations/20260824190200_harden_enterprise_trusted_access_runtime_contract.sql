begin;

-- Final fail-closed hardening for the V21 Trusted Access runtime. This patch is
-- deliberately a later forward identity so both fresh Production promotion and
-- full-history/staging replay converge without rewriting historical migrations.

-- The operation-detail API exposes these nullable compatibility projections.
-- They remain non-authoritative until a governed group-policy plane exists.
alter table public.enterprise_access_operation_items
  add column if not exists source_group_id uuid,
  add column if not exists department_key text;

-- Successful pagination must not consume failure retry budget. Only an actual
-- retry or recovery of an expired processing lease increments attempts.
create or replace function public.claim_enterprise_access_operation()
returns table (
  operation_id uuid,
  organization_id uuid,
  operation_type text,
  batch_size integer,
  lease_token uuid
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_operation public.enterprise_access_operations%rowtype;
  v_token uuid := gen_random_uuid();
begin
  -- A stale processing lease that already exhausted its failure/recovery
  -- budget must close fail-closed instead of remaining claimable forever.
  update public.enterprise_access_operations
  set status = 'dead_letter',
      lease_token = null,
      lease_expires_at = null,
      last_error_code = coalesce(last_error_code, 'lease_retry_budget_exhausted'),
      updated_at = now()
  where status = 'processing'
    and lease_expires_at < now()
    and attempts >= max_attempts;

  select *
  into v_operation
  from public.enterprise_access_operations
  where (
      status = 'pending'
      and available_at <= now()
    ) or (
      status = 'retry'
      and available_at <= now()
      and attempts < max_attempts
    ) or (
      status = 'processing'
      and lease_expires_at < now()
      and attempts < max_attempts
    )
  order by available_at, created_at
  for update skip locked
  limit 1;

  if not found then return; end if;

  update public.enterprise_access_operations
  set status = 'processing',
      attempts = case
        when v_operation.status in ('retry', 'processing')
          then least(attempts + 1, max_attempts)
        else attempts
      end,
      lease_token = v_token,
      lease_expires_at = now() + interval '10 minutes',
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where id = v_operation.id;

  return query select
    v_operation.id,
    v_operation.organization_id,
    v_operation.operation_type,
    v_operation.batch_size,
    v_token;
end;
$$;

create or replace function public.finalize_enterprise_access_operation(
  p_operation_id uuid,
  p_lease_token uuid
)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_pending integer;
  v_failed integer;
  v_attempts integer;
  v_max_attempts integer;
begin
  select attempts, max_attempts
  into v_attempts, v_max_attempts
  from public.enterprise_access_operations
  where id = p_operation_id
    and status = 'processing'
    and lease_token = p_lease_token
  for update;

  if not found then return 'lease_mismatch'; end if;

  select
    count(*) filter (where status in ('pending','processing')),
    count(*) filter (where status = 'failed')
  into v_pending, v_failed
  from public.enterprise_access_operation_items
  where operation_id = p_operation_id;

  update public.enterprise_access_operations o
  set processed_count = s.processed,
      succeeded_count = s.succeeded,
      failed_count = s.failed,
      skipped_count = s.skipped,
      compensated_count = s.compensated,
      status = case
        -- Ordinary pagination is not a failure/retry. Return immediately to
        -- pending so large operations can span any number of successful pages.
        when v_pending > 0 and v_failed = 0 then 'pending'
        when v_failed > 0 and v_attempts >= v_max_attempts then 'dead_letter'
        when v_failed > 0 then 'retry'
        else 'completed'
      end,
      available_at = case
        when v_pending > 0 and v_failed = 0 then now()
        when v_failed > 0 and v_attempts < v_max_attempts then now() + interval '30 seconds'
        else available_at
      end,
      lease_token = null,
      lease_expires_at = null,
      completed_at = case when v_pending = 0 and v_failed = 0 then now() else completed_at end,
      updated_at = now()
  from (
    select
      count(*) filter (where status in ('succeeded','failed','skipped','compensated'))::integer as processed,
      count(*) filter (where status = 'succeeded')::integer as succeeded,
      count(*) filter (where status = 'failed')::integer as failed,
      count(*) filter (where status = 'skipped')::integer as skipped,
      count(*) filter (where status = 'compensated')::integer as compensated
    from public.enterprise_access_operation_items
    where operation_id = p_operation_id
  ) s
  where o.id = p_operation_id;

  return 'finalized';
end;
$$;

-- Bind the licensing idempotency key to the exact membership + requested seat
-- mutation so a reused correlation ID cannot falsely report another member as
-- reserved. Capacity itself remains exclusively authoritative in the V20/V21
-- atomic licensing RPC.
create or replace function public.reserve_enterprise_seat_with_concurrency_guard(
  p_organization_id uuid,
  p_membership_id uuid,
  p_requested_seat_type text,
  p_expected_contract_version bigint,
  p_actor_user_id uuid,
  p_correlation_id uuid default gen_random_uuid()
)
returns table (
  outcome text,
  used_seats integer,
  seat_limit integer,
  contract_version bigint
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_member public.organization_members%rowtype;
  v_contract public.enterprise_contracts%rowtype;
  v_result record;
  v_corr uuid := coalesce(p_correlation_id, gen_random_uuid());
  v_outcome text;
  v_idempotency_key text;
begin
  if p_organization_id is null
     or p_membership_id is null
     or p_actor_user_id is null
     or p_requested_seat_type not in ('full','participant','viewer') then
    return query select 'membership_not_found'::text, 0, 0, 0::bigint;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 0));

  select *
  into v_member
  from public.organization_members
  where organization_id = p_organization_id
    and id = p_membership_id
    and status = 'active'
  for update;

  if not found then
    insert into public.enterprise_seat_contention_events (
      organization_id, membership_id, requested_seat_type, outcome, actor_user_id, correlation_id
    ) values (
      p_organization_id, null, p_requested_seat_type, 'membership_not_found', p_actor_user_id, v_corr
    );
    return query select 'membership_not_found'::text, 0, 0, 0::bigint;
    return;
  end if;

  select *
  into v_contract
  from public.enterprise_contracts
  where organization_id = p_organization_id
    and status in ('draft','pending_activation','active','past_due','grace_period','read_only','suspended')
  order by version desc, updated_at desc
  limit 1
  for update;

  if not found then
    insert into public.enterprise_seat_contention_events (
      organization_id, membership_id, requested_seat_type, outcome, actor_user_id, correlation_id
    ) values (
      p_organization_id, p_membership_id, p_requested_seat_type, 'contract_not_found', p_actor_user_id, v_corr
    );
    return query select 'contract_not_found'::text, 0, 0, 0::bigint;
    return;
  end if;

  if p_expected_contract_version is not null
     and v_contract.version <> p_expected_contract_version then
    insert into public.enterprise_seat_contention_events (
      organization_id, membership_id, requested_seat_type, outcome,
      contract_version, actor_user_id, correlation_id
    ) values (
      p_organization_id, p_membership_id, p_requested_seat_type, 'version_conflict',
      v_contract.version, p_actor_user_id, v_corr
    );
    return query select 'version_conflict'::text, 0, 0, v_contract.version::bigint;
    return;
  end if;

  v_idempotency_key := format(
    'seat-contention:%s:%s:%s',
    v_corr::text,
    p_membership_id::text,
    p_requested_seat_type
  );

  select *
  into v_result
  from public.reserve_organization_seat_idempotent_atomic(
    p_organization_id,
    v_member.user_id,
    v_member.role,
    p_requested_seat_type,
    p_actor_user_id,
    v_idempotency_key,
    'admin'
  );

  v_outcome := case
    when v_result.outcome in ('reserved','already_active','seat_changed','duplicate') then 'reserved'
    when v_result.outcome in ('member_limit_reached','seat_limit_reached','admin_limit_reached') then 'capacity_exhausted'
    when v_result.outcome = 'contract_missing' then 'contract_not_found'
    else 'membership_not_found'
  end;

  insert into public.enterprise_seat_contention_events (
    organization_id, membership_id, requested_seat_type, outcome,
    contract_version, used_seats, seat_limit, actor_user_id, correlation_id, details
  ) values (
    p_organization_id,
    p_membership_id,
    p_requested_seat_type,
    v_outcome,
    v_contract.version,
    greatest(coalesce(v_result.seat_usage, 0), 0),
    greatest(coalesce(v_result.seat_limit, 0), 0),
    p_actor_user_id,
    v_corr,
    jsonb_build_object(
      'licensingOutcome', v_result.outcome,
      'idempotencyScope', 'correlation+membership+seat_type'
    )
  );

  return query select
    v_outcome,
    greatest(coalesce(v_result.seat_usage, 0), 0),
    greatest(coalesce(v_result.seat_limit, 0), 0),
    v_contract.version::bigint;
end;
$$;

revoke all on function public.claim_enterprise_access_operation() from public, anon, authenticated;
revoke all on function public.finalize_enterprise_access_operation(uuid,uuid) from public, anon, authenticated;
revoke all on function public.reserve_enterprise_seat_with_concurrency_guard(uuid,uuid,text,bigint,uuid,uuid) from public, anon, authenticated;
grant execute on function public.claim_enterprise_access_operation() to service_role;
grant execute on function public.finalize_enterprise_access_operation(uuid,uuid) to service_role;
grant execute on function public.reserve_enterprise_seat_with_concurrency_guard(uuid,uuid,text,bigint,uuid,uuid) to service_role;

-- Fail closed on the exact contract required by current routes/workers.
do $verify$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='enterprise_access_operation_items' and column_name='source_group_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='enterprise_access_operation_items' and column_name='department_key'
  ) then
    raise exception 'trusted access operation-detail compatibility columns are missing';
  end if;

  if has_function_privilege('authenticated','public.claim_enterprise_access_operation()','EXECUTE')
     or has_function_privilege('authenticated','public.finalize_enterprise_access_operation(uuid,uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.reserve_enterprise_seat_with_concurrency_guard(uuid,uuid,text,bigint,uuid,uuid)','EXECUTE') then
    raise exception 'browser execution survived Trusted Access hardening';
  end if;
end
$verify$;

commit;
