begin;

create table if not exists public.enterprise_provisioning_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source text not null check (source in ('csv','api','scim','sso','platform','admin')),
  status text not null default 'queued' check (
    status in ('queued','processing','completed','completed_with_errors','failed','cancelled')
  ),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 160),
  request_digest text not null check (request_digest ~ '^[a-f0-9]{64}$'),
  total_items integer not null check (total_items between 1 and 10000),
  processed_items integer not null default 0 check (processed_items >= 0),
  succeeded_items integer not null default 0 check (succeeded_items >= 0),
  failed_items integer not null default 0 check (failed_items >= 0),
  created_by uuid not null references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source, idempotency_key),
  check (processed_items <= total_items),
  check (succeeded_items + failed_items <= total_items)
);

create table if not exists public.enterprise_provisioning_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.enterprise_provisioning_jobs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  row_number integer not null check (row_number between 1 and 10000),
  email text not null check (char_length(email) between 3 and 254),
  role text not null check (role in ('admin','editor','viewer')),
  seat_type text not null check (seat_type in ('full','participant','viewer')),
  status text not null default 'queued' check (
    status in ('queued','processing','succeeded','failed','cancelled')
  ),
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  next_attempt_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  invitation_id uuid references public.invitations(id) on delete set null,
  error_code text check (error_code is null or char_length(error_code) <= 120),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, row_number),
  unique (job_id, email)
);

create index if not exists enterprise_provisioning_jobs_org_created_idx
  on public.enterprise_provisioning_jobs (organization_id, created_at desc);
create index if not exists enterprise_provisioning_jobs_status_idx
  on public.enterprise_provisioning_jobs (status, created_at)
  where status in ('queued','processing');
create index if not exists enterprise_provisioning_items_claim_idx
  on public.enterprise_provisioning_job_items (status, next_attempt_at, created_at)
  where status in ('queued','processing');
create index if not exists enterprise_provisioning_items_job_status_idx
  on public.enterprise_provisioning_job_items (job_id, status);

alter table public.enterprise_provisioning_jobs enable row level security;
alter table public.enterprise_provisioning_jobs force row level security;
alter table public.enterprise_provisioning_job_items enable row level security;
alter table public.enterprise_provisioning_job_items force row level security;

revoke all on public.enterprise_provisioning_jobs from public, anon, authenticated;
revoke all on public.enterprise_provisioning_job_items from public, anon, authenticated;
grant all on public.enterprise_provisioning_jobs to service_role;
grant all on public.enterprise_provisioning_job_items to service_role;

create or replace function public.can_operate_enterprise_provisioning(
  p_organization_id uuid,
  p_actor_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members as member
    where member.organization_id = p_organization_id
      and member.user_id = p_actor_user_id
      and lower(coalesce(member.role, '')) in ('owner','admin')
      and coalesce(member.status, 'active') = 'active'
  ) or exists (
    select 1
    from public.platform_admin_users as platform_actor
    where platform_actor.user_id = p_actor_user_id
      and platform_actor.enabled = true
      and platform_actor.role in (
        'owner','sales_admin','platform_owner','platform_admin','platform_support'
      )
  );
$$;

revoke all on function public.can_operate_enterprise_provisioning(uuid, uuid) from public, anon, authenticated;

create or replace function public.create_enterprise_provisioning_job_atomic(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_source text,
  p_idempotency_key text,
  p_request_digest text,
  p_items jsonb
)
returns table (
  outcome text,
  job_id uuid,
  job_status text,
  total_items integer,
  available_members integer,
  available_full_users integer,
  available_participants integer,
  available_viewers integer,
  available_admins integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text := lower(trim(coalesce(p_source, '')));
  v_idempotency_key text := trim(coalesce(p_idempotency_key, ''));
  v_existing public.enterprise_provisioning_jobs%rowtype;
  v_snapshot record;
  v_total integer;
  v_requested_full integer;
  v_requested_participant integer;
  v_requested_viewer integer;
  v_requested_admin integer;
  v_queued_members integer;
  v_queued_full integer;
  v_queued_participant integer;
  v_queued_viewer integer;
  v_queued_admin integer;
  v_job public.enterprise_provisioning_jobs%rowtype;
begin
  if p_organization_id is null
    or p_actor_user_id is null
    or v_source not in ('csv','api','scim','sso','platform','admin')
    or char_length(v_idempotency_key) not between 8 and 160
    or coalesce(p_request_digest, '') !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_items) <> 'array' then
    return query select 'invalid_input'::text, null::uuid, null::text, 0, 0, 0, 0, 0, 0;
    return;
  end if;

  if not public.can_operate_enterprise_provisioning(p_organization_id, p_actor_user_id) then
    return query select 'operator_required'::text, null::uuid, null::text, 0, 0, 0, 0, 0, 0;
    return;
  end if;

  select job.* into v_existing
  from public.enterprise_provisioning_jobs as job
  where job.organization_id = p_organization_id
    and job.source = v_source
    and job.idempotency_key = v_idempotency_key;

  if found then
    return query select
      'duplicate'::text,
      v_existing.id,
      v_existing.status,
      v_existing.total_items,
      0, 0, 0, 0, 0;
    return;
  end if;

  v_total := jsonb_array_length(p_items);
  if v_total < 1 or v_total > 10000 then
    return query select 'invalid_item_count'::text, null::uuid, null::text, v_total, 0, 0, 0, 0, 0;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item
    where lower(trim(coalesce(item->>'email', ''))) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      or char_length(lower(trim(coalesce(item->>'email', '')))) > 254
      or lower(trim(coalesce(item->>'role', ''))) not in ('admin','editor','viewer')
      or lower(trim(coalesce(item->>'seatType', ''))) not in ('full','participant','viewer')
  ) then
    return query select 'invalid_item'::text, null::uuid, null::text, v_total, 0, 0, 0, 0, 0;
    return;
  end if;

  if exists (
    select 1
    from (
      select lower(trim(item->>'email')) as email, count(*)
      from jsonb_array_elements(p_items) as item
      group by lower(trim(item->>'email'))
      having count(*) > 1
    ) as duplicate_email
  ) then
    return query select 'duplicate_email'::text, null::uuid, null::text, v_total, 0, 0, 0, 0, 0;
    return;
  end if;

  insert into public.organization_usage (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  perform 1
  from public.organization_usage as usage
  where usage.organization_id = p_organization_id
  for update;

  select * into v_snapshot
  from public.resolve_organization_entitlements_v3(p_organization_id);

  if v_snapshot.outcome is distinct from 'resolved' or v_snapshot.contract_status is distinct from 'active' then
    return query select 'contract_not_active'::text, null::uuid, null::text, v_total, 0, 0, 0, 0, 0;
    return;
  end if;

  select
    count(*) filter (where lower(trim(item->>'seatType')) = 'full'),
    count(*) filter (where lower(trim(item->>'seatType')) = 'participant'),
    count(*) filter (where lower(trim(item->>'seatType')) = 'viewer'),
    count(*) filter (where lower(trim(item->>'role')) = 'admin')
  into v_requested_full, v_requested_participant, v_requested_viewer, v_requested_admin
  from jsonb_array_elements(p_items) as item;

  select
    count(*),
    count(*) filter (where queued.seat_type = 'full'),
    count(*) filter (where queued.seat_type = 'participant'),
    count(*) filter (where queued.seat_type = 'viewer'),
    count(*) filter (where queued.role = 'admin')
  into v_queued_members, v_queued_full, v_queued_participant, v_queued_viewer, v_queued_admin
  from public.enterprise_provisioning_job_items as queued
  where queued.organization_id = p_organization_id
    and queued.status in ('queued','processing');

  v_queued_members := coalesce(v_queued_members, 0);
  v_queued_full := coalesce(v_queued_full, 0);
  v_queued_participant := coalesce(v_queued_participant, 0);
  v_queued_viewer := coalesce(v_queued_viewer, 0);
  v_queued_admin := coalesce(v_queued_admin, 0);

  if v_snapshot.active_members + v_snapshot.pending_invitations + v_queued_members + v_total > v_snapshot.member_limit
    or v_snapshot.full_users + v_snapshot.pending_full_users + v_queued_full + v_requested_full > v_snapshot.full_user_limit
    or v_snapshot.participants + v_snapshot.pending_participants + v_queued_participant + v_requested_participant > v_snapshot.participant_limit
    or v_snapshot.viewers + v_snapshot.pending_viewers + v_queued_viewer + v_requested_viewer > v_snapshot.viewer_limit
    or v_snapshot.active_admins + v_snapshot.pending_admins + v_queued_admin + v_requested_admin > v_snapshot.admin_limit then
    return query select
      'capacity_insufficient'::text,
      null::uuid,
      null::text,
      v_total,
      greatest(v_snapshot.member_limit - v_snapshot.active_members - v_snapshot.pending_invitations - v_queued_members, 0),
      greatest(v_snapshot.full_user_limit - v_snapshot.full_users - v_snapshot.pending_full_users - v_queued_full, 0),
      greatest(v_snapshot.participant_limit - v_snapshot.participants - v_snapshot.pending_participants - v_queued_participant, 0),
      greatest(v_snapshot.viewer_limit - v_snapshot.viewers - v_snapshot.pending_viewers - v_queued_viewer, 0),
      greatest(v_snapshot.admin_limit - v_snapshot.active_admins - v_snapshot.pending_admins - v_queued_admin, 0);
    return;
  end if;

  insert into public.enterprise_provisioning_jobs (
    organization_id,
    source,
    status,
    idempotency_key,
    request_digest,
    total_items,
    created_by
  ) values (
    p_organization_id,
    v_source,
    'queued',
    v_idempotency_key,
    p_request_digest,
    v_total,
    p_actor_user_id
  ) returning * into v_job;

  insert into public.enterprise_provisioning_job_items (
    job_id,
    organization_id,
    row_number,
    email,
    role,
    seat_type
  )
  select
    v_job.id,
    p_organization_id,
    item.ordinality::integer,
    lower(trim(item.value->>'email')),
    lower(trim(item.value->>'role')),
    lower(trim(item.value->>'seatType'))
  from jsonb_array_elements(p_items) with ordinality as item(value, ordinality);

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_organization_id,
    p_actor_user_id,
    'enterprise.provisioning_job_created',
    'enterprise_provisioning_job',
    v_job.id::text,
    jsonb_build_object('source', v_source, 'total_items', v_total)
  );

  return query select
    'created'::text,
    v_job.id,
    v_job.status,
    v_total,
    greatest(v_snapshot.member_limit - v_snapshot.active_members - v_snapshot.pending_invitations - v_queued_members - v_total, 0),
    greatest(v_snapshot.full_user_limit - v_snapshot.full_users - v_snapshot.pending_full_users - v_queued_full - v_requested_full, 0),
    greatest(v_snapshot.participant_limit - v_snapshot.participants - v_snapshot.pending_participants - v_queued_participant - v_requested_participant, 0),
    greatest(v_snapshot.viewer_limit - v_snapshot.viewers - v_snapshot.pending_viewers - v_queued_viewer - v_requested_viewer, 0),
    greatest(v_snapshot.admin_limit - v_snapshot.active_admins - v_snapshot.pending_admins - v_queued_admin - v_requested_admin, 0);
end;
$$;

create or replace function public.claim_enterprise_provisioning_items_atomic(
  p_batch_size integer default 50
)
returns table (
  item_id uuid,
  job_id uuid,
  organization_id uuid,
  actor_user_id uuid,
  email text,
  role text,
  seat_type text,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_batch_size < 1 or p_batch_size > 200 then
    raise exception 'invalid_batch_size';
  end if;

  return query
  with claimable as (
    select item.id
    from public.enterprise_provisioning_job_items as item
    join public.enterprise_provisioning_jobs as job on job.id = item.job_id
    where job.status in ('queued','processing')
      and (
        (item.status = 'queued' and item.next_attempt_at <= now())
        or (item.status = 'processing' and item.lease_expires_at < now())
      )
    order by item.created_at, item.row_number
    for update of item skip locked
    limit p_batch_size
  ), claimed as (
    update public.enterprise_provisioning_job_items as item
    set
      status = 'processing',
      attempt_count = item.attempt_count + 1,
      lease_expires_at = now() + interval '5 minutes',
      updated_at = now()
    from claimable
    where item.id = claimable.id
    returning item.*
  ), started_jobs as (
    update public.enterprise_provisioning_jobs as job
    set
      status = 'processing',
      started_at = coalesce(job.started_at, now()),
      updated_at = now()
    where job.id in (select distinct claimed.job_id from claimed)
    returning job.id
  )
  select
    claimed.id,
    claimed.job_id,
    claimed.organization_id,
    job.created_by,
    claimed.email,
    claimed.role,
    claimed.seat_type,
    claimed.attempt_count
  from claimed
  join public.enterprise_provisioning_jobs as job on job.id = claimed.job_id;
end;
$$;

create or replace function public.complete_enterprise_provisioning_item_atomic(
  p_item_id uuid,
  p_outcome text,
  p_invitation_id uuid default null,
  p_error_code text default null
)
returns table (
  outcome text,
  job_id uuid,
  job_status text,
  processed_items integer,
  succeeded_items integer,
  failed_items integer,
  total_items integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.enterprise_provisioning_job_items%rowtype;
  v_job public.enterprise_provisioning_jobs%rowtype;
  v_processed integer;
  v_succeeded integer;
  v_failed integer;
  v_status text;
begin
  if p_item_id is null or p_outcome not in ('succeeded','failed','retry') then
    return query select 'invalid_input'::text, null::uuid, null::text, 0, 0, 0, 0;
    return;
  end if;

  select item.* into v_item
  from public.enterprise_provisioning_job_items as item
  where item.id = p_item_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text, 0, 0, 0, 0;
    return;
  end if;

  if v_item.status in ('succeeded','failed','cancelled') then
    select job.* into v_job
    from public.enterprise_provisioning_jobs as job
    where job.id = v_item.job_id;
    return query select
      'duplicate'::text,
      v_job.id,
      v_job.status,
      v_job.processed_items,
      v_job.succeeded_items,
      v_job.failed_items,
      v_job.total_items;
    return;
  end if;

  if p_outcome = 'succeeded' then
    update public.enterprise_provisioning_job_items as item
    set
      status = 'succeeded',
      invitation_id = p_invitation_id,
      error_code = null,
      processed_at = now(),
      lease_expires_at = null,
      updated_at = now()
    where item.id = p_item_id;
  elsif p_outcome = 'retry' and v_item.attempt_count < 5 then
    update public.enterprise_provisioning_job_items as item
    set
      status = 'queued',
      error_code = left(coalesce(p_error_code, 'retryable_failure'), 120),
      next_attempt_at = now() + make_interval(secs => least(3600, (15 * power(2, greatest(v_item.attempt_count - 1, 0)))::integer)),
      lease_expires_at = null,
      updated_at = now()
    where item.id = p_item_id;
  else
    update public.enterprise_provisioning_job_items as item
    set
      status = 'failed',
      error_code = left(coalesce(p_error_code, 'provisioning_failed'), 120),
      processed_at = now(),
      lease_expires_at = null,
      updated_at = now()
    where item.id = p_item_id;
  end if;

  select
    count(*) filter (where item.status in ('succeeded','failed','cancelled')),
    count(*) filter (where item.status = 'succeeded'),
    count(*) filter (where item.status = 'failed')
  into v_processed, v_succeeded, v_failed
  from public.enterprise_provisioning_job_items as item
  where item.job_id = v_item.job_id;

  select job.* into v_job
  from public.enterprise_provisioning_jobs as job
  where job.id = v_item.job_id
  for update;

  if v_processed >= v_job.total_items then
    v_status := case
      when v_succeeded = v_job.total_items then 'completed'
      when v_succeeded > 0 then 'completed_with_errors'
      else 'failed'
    end;
  else
    v_status := 'processing';
  end if;

  update public.enterprise_provisioning_jobs as job
  set
    status = v_status,
    processed_items = v_processed,
    succeeded_items = v_succeeded,
    failed_items = v_failed,
    completed_at = case when v_processed >= job.total_items then now() else null end,
    updated_at = now()
  where job.id = v_item.job_id
  returning * into v_job;

  if v_processed >= v_job.total_items then
    insert into public.audit_logs (
      organization_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) values (
      v_job.organization_id,
      v_job.created_by,
      'enterprise.provisioning_job_completed',
      'enterprise_provisioning_job',
      v_job.id::text,
      jsonb_build_object(
        'status', v_job.status,
        'total_items', v_job.total_items,
        'succeeded_items', v_job.succeeded_items,
        'failed_items', v_job.failed_items
      )
    );
  end if;

  return query select
    'updated'::text,
    v_job.id,
    v_job.status,
    v_job.processed_items,
    v_job.succeeded_items,
    v_job.failed_items,
    v_job.total_items;
end;
$$;

create or replace function public.cancel_enterprise_provisioning_job_atomic(
  p_job_id uuid,
  p_actor_user_id uuid
)
returns table (outcome text, job_id uuid, job_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.enterprise_provisioning_jobs%rowtype;
begin
  select job.* into v_job
  from public.enterprise_provisioning_jobs as job
  where job.id = p_job_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text;
    return;
  end if;

  if not public.can_operate_enterprise_provisioning(v_job.organization_id, p_actor_user_id) then
    return query select 'operator_required'::text, v_job.id, v_job.status;
    return;
  end if;

  if v_job.status in ('completed','completed_with_errors','failed','cancelled') then
    return query select 'unchanged'::text, v_job.id, v_job.status;
    return;
  end if;

  update public.enterprise_provisioning_job_items as item
  set status = 'cancelled', lease_expires_at = null, processed_at = now(), updated_at = now()
  where item.job_id = v_job.id
    and item.status in ('queued','processing');

  update public.enterprise_provisioning_jobs as job
  set
    status = 'cancelled',
    processed_items = job.total_items,
    cancelled_at = now(),
    completed_at = now(),
    updated_at = now()
  where job.id = v_job.id
  returning * into v_job;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_job.organization_id,
    p_actor_user_id,
    'enterprise.provisioning_job_cancelled',
    'enterprise_provisioning_job',
    v_job.id::text,
    jsonb_build_object('source', v_job.source)
  );

  return query select 'cancelled'::text, v_job.id, v_job.status;
end;
$$;

revoke all on function public.create_enterprise_provisioning_job_atomic(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.claim_enterprise_provisioning_items_atomic(integer) from public, anon, authenticated;
revoke all on function public.complete_enterprise_provisioning_item_atomic(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_enterprise_provisioning_job_atomic(uuid, uuid) from public, anon, authenticated;

grant execute on function public.create_enterprise_provisioning_job_atomic(uuid, uuid, text, text, text, jsonb) to service_role;
grant execute on function public.claim_enterprise_provisioning_items_atomic(integer) to service_role;
grant execute on function public.complete_enterprise_provisioning_item_atomic(uuid, text, uuid, text) to service_role;
grant execute on function public.cancel_enterprise_provisioning_job_atomic(uuid, uuid) to service_role;

notify pgrst, 'reload schema';

commit;
