begin;

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
  cursor_identity_id uuid,
  total_candidates integer not null default 0 check (total_candidates >= 0),
  processed_count integer not null default 0 check (processed_count >= 0),
  succeeded_count integer not null default 0 check (succeeded_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
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
  identity_id uuid not null,
  membership_id uuid,
  user_id uuid,
  source_group_id uuid,
  department_key text,
  previous_role text,
  requested_role text,
  previous_seat_type text,
  requested_seat_type text,
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
  primary key (operation_id, identity_id),
  constraint enterprise_access_operation_item_identity_fk
    foreign key (organization_id, identity_id)
    references public.enterprise_scim_identities(organization_id, id)
    on delete cascade,
  constraint enterprise_access_operation_item_membership_fk
    foreign key (organization_id, membership_id)
    references public.organization_members(organization_id, id)
    on delete set null (membership_id),
  constraint enterprise_access_operation_item_group_fk
    foreign key (organization_id, source_group_id)
    references public.enterprise_scim_groups(organization_id, id)
    on delete set null (source_group_id)
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
grant all on public.enterprise_access_operations to service_role;
grant all on public.enterprise_access_operation_items to service_role;
grant all on public.enterprise_access_operation_events to service_role;

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
set search_path = public
as $$
declare
  v_operation_id uuid;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if p_organization_id is null
    or p_requested_by is null
    or p_operation_type not in ('group_reconciliation','member_export','policy_recompute')
    or char_length(v_reason) not between 8 and 500 then
    raise exception 'invalid_access_operation_input';
  end if;

  insert into public.enterprise_access_operations (
    organization_id, operation_type, requested_by, reason, batch_size
  ) values (
    p_organization_id,
    p_operation_type,
    p_requested_by,
    v_reason,
    least(greatest(coalesce(p_batch_size, 100), 1), 500)
  )
  returning id into v_operation_id;

  insert into public.enterprise_access_operation_events (
    operation_id, organization_id, actor_user_id, event_type, reason
  ) values (
    v_operation_id, p_organization_id, p_requested_by, 'created', v_reason
  );

  return v_operation_id;
exception
  when unique_violation then
    select id into v_operation_id
    from public.enterprise_access_operations
    where organization_id = p_organization_id
      and operation_type = p_operation_type
      and status in ('pending','processing','paused','retry')
    order by created_at desc
    limit 1;
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
set search_path = public
as $$
declare
  v_operation public.enterprise_access_operations%rowtype;
  v_inserted integer := 0;
begin
  select * into v_operation
  from public.enterprise_access_operations
  where id = p_operation_id
  for update;
  if not found then raise exception 'access_operation_not_found'; end if;
  if v_operation.status not in ('pending','paused','retry') then return 0; end if;

  insert into public.enterprise_access_operation_items (
    operation_id,
    organization_id,
    identity_id,
    membership_id,
    user_id,
    source_group_id,
    department_key,
    previous_role,
    requested_role,
    previous_seat_type,
    requested_seat_type,
    idempotency_key,
    before_snapshot
  )
  select
    v_operation.id,
    v_operation.organization_id,
    c.identity_id,
    c.membership_id,
    c.user_id,
    c.source_group_id,
    c.department_key,
    c.current_role,
    c.resolved_role,
    c.current_seat_type,
    c.resolved_seat_type,
    'access-op:' || encode(digest(
      v_operation.id::text || ':' || c.identity_id::text || ':' || c.resolved_role || ':' || c.resolved_seat_type,
      'sha256'
    ), 'hex'),
    jsonb_build_object(
      'role', c.current_role,
      'seatType', c.current_seat_type,
      'departmentKey', c.department_key
    )
  from public.list_enterprise_group_access_reconciliation_candidates(
    v_operation.organization_id,
    least(greatest(coalesce(p_limit, 10000), 1), 10000)
  ) c
  on conflict (operation_id, identity_id) do nothing;

  get diagnostics v_inserted = row_count;
  update public.enterprise_access_operations
  set total_candidates = (
        select count(*) from public.enterprise_access_operation_items i
        where i.operation_id = v_operation.id
      ),
      updated_at = now()
  where id = v_operation.id;

  return v_inserted;
end;
$$;

create or replace function public.claim_enterprise_access_operation_item(
  p_operation_id uuid,
  p_lease_token uuid
)
returns table (
  identity_id uuid,
  organization_id uuid,
  membership_id uuid,
  user_id uuid,
  source_group_id uuid,
  department_key text,
  requested_role text,
  requested_seat_type text,
  idempotency_key text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation public.enterprise_access_operations%rowtype;
  v_item public.enterprise_access_operation_items%rowtype;
begin
  select * into v_operation
  from public.enterprise_access_operations
  where id = p_operation_id
  for update;

  if not found or v_operation.status in ('completed','cancelled','dead_letter') then return; end if;
  if v_operation.lease_token is distinct from p_lease_token then return; end if;

  select * into v_item
  from public.enterprise_access_operation_items
  where operation_id = p_operation_id
    and status in ('pending','failed')
    and attempt_count < 10
  order by identity_id
  for update skip locked
  limit 1;

  if not found then return; end if;

  update public.enterprise_access_operation_items
  set status = 'processing',
      attempt_count = attempt_count + 1,
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where operation_id = p_operation_id and identity_id = v_item.identity_id;

  return query select
    v_item.identity_id,
    v_item.organization_id,
    v_item.membership_id,
    v_item.user_id,
    v_item.source_group_id,
    v_item.department_key,
    v_item.requested_role,
    v_item.requested_seat_type,
    v_item.idempotency_key;
end;
$$;

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
set search_path = public
as $$
declare
  v_operation public.enterprise_access_operations%rowtype;
  v_token uuid := gen_random_uuid();
begin
  select * into v_operation
  from public.enterprise_access_operations
  where (
    status in ('pending','retry') and available_at <= now()
  ) or (
    status = 'processing' and lease_expires_at < now()
  )
  order by available_at, created_at
  for update skip locked
  limit 1;

  if not found then return; end if;

  update public.enterprise_access_operations
  set status = 'processing',
      attempts = attempts + 1,
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

create or replace function public.finish_enterprise_access_operation_item(
  p_operation_id uuid,
  p_identity_id uuid,
  p_status text,
  p_outcome_code text,
  p_after_snapshot jsonb default '{}'::jsonb,
  p_error_detail text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('succeeded','failed','skipped','compensated') then return 'invalid_status'; end if;

  update public.enterprise_access_operation_items
  set status = p_status,
      outcome_code = left(coalesce(p_outcome_code, 'unknown'), 120),
      after_snapshot = coalesce(p_after_snapshot, '{}'::jsonb),
      error_detail = left(p_error_detail, 500),
      completed_at = now(),
      updated_at = now()
  where operation_id = p_operation_id and identity_id = p_identity_id;

  if not found then return 'not_found'; end if;
  return 'recorded';
end;
$$;

create or replace function public.finalize_enterprise_access_operation(
  p_operation_id uuid,
  p_lease_token uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending integer;
  v_failed integer;
begin
  if not exists (
    select 1 from public.enterprise_access_operations
    where id = p_operation_id and status = 'processing' and lease_token = p_lease_token
  ) then return 'lease_mismatch'; end if;

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
      status = case
        when v_pending > 0 then 'retry'
        when v_failed > 0 and attempts >= max_attempts then 'dead_letter'
        when v_failed > 0 then 'retry'
        else 'completed'
      end,
      available_at = case when v_pending > 0 or v_failed > 0 then now() + interval '30 seconds' else available_at end,
      lease_token = null,
      lease_expires_at = null,
      completed_at = case when v_pending = 0 and v_failed = 0 then now() else completed_at end,
      updated_at = now()
  from (
    select
      count(*) filter (where status in ('succeeded','failed','skipped','compensated')) as processed,
      count(*) filter (where status = 'succeeded') as succeeded,
      count(*) filter (where status = 'failed') as failed,
      count(*) filter (where status in ('skipped','compensated')) as skipped
    from public.enterprise_access_operation_items
    where operation_id = p_operation_id
  ) s
  where o.id = p_operation_id;

  return 'finalized';
end;
$$;

create or replace function public.control_enterprise_access_operation(
  p_operation_id uuid,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation public.enterprise_access_operations%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if p_action not in ('pause','resume','cancel','retry_failed')
    or char_length(v_reason) not between 8 and 500 then
    return 'invalid_input';
  end if;

  select * into v_operation
  from public.enterprise_access_operations
  where id = p_operation_id and organization_id = p_organization_id
  for update;
  if not found then return 'not_found'; end if;

  if p_action = 'cancel' then
    update public.enterprise_access_operations
    set status = 'cancelled', cancellation_reason = v_reason,
        cancelled_at = now(), lease_token = null, lease_expires_at = null, updated_at = now()
    where id = p_operation_id and status not in ('completed','cancelled');
  elsif p_action = 'pause' then
    update public.enterprise_access_operations
    set status = 'paused', lease_token = null, lease_expires_at = null, updated_at = now()
    where id = p_operation_id and status in ('pending','retry','processing');
  elsif p_action = 'resume' then
    update public.enterprise_access_operations
    set status = 'pending', available_at = now(), updated_at = now()
    where id = p_operation_id and status = 'paused';
  else
    update public.enterprise_access_operation_items
    set status = 'pending', error_detail = null, updated_at = now()
    where operation_id = p_operation_id and status = 'failed';
    update public.enterprise_access_operations
    set status = 'pending', available_at = now(), last_error_code = null, updated_at = now()
    where id = p_operation_id and status in ('retry','dead_letter','completed');
  end if;

  insert into public.enterprise_access_operation_events (
    operation_id, organization_id, actor_user_id, event_type, reason
  ) values (
    p_operation_id, p_organization_id, p_actor_user_id, p_action, v_reason
  );

  return p_action || 'd';
end;
$$;

create or replace function public.export_enterprise_access_operation_members(
  p_operation_id uuid,
  p_organization_id uuid
)
returns table (
  identity_id uuid,
  membership_id uuid,
  user_id uuid,
  department_key text,
  source_group_id uuid,
  previous_role text,
  requested_role text,
  previous_seat_type text,
  requested_seat_type text,
  status text,
  outcome_code text,
  attempt_count integer,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    i.identity_id,
    i.membership_id,
    i.user_id,
    i.department_key,
    i.source_group_id,
    i.previous_role,
    i.requested_role,
    i.previous_seat_type,
    i.requested_seat_type,
    i.status,
    i.outcome_code,
    i.attempt_count,
    i.completed_at
  from public.enterprise_access_operation_items i
  join public.enterprise_access_operations o on o.id = i.operation_id
  where i.operation_id = p_operation_id
    and i.organization_id = p_organization_id
    and o.organization_id = p_organization_id
  order by i.identity_id;
$$;

revoke all on function public.create_enterprise_access_operation(uuid,text,uuid,text,integer) from public, anon, authenticated;
revoke all on function public.seed_enterprise_access_operation_items(uuid,integer) from public, anon, authenticated;
revoke all on function public.claim_enterprise_access_operation() from public, anon, authenticated;
revoke all on function public.claim_enterprise_access_operation_item(uuid,uuid) from public, anon, authenticated;
revoke all on function public.finish_enterprise_access_operation_item(uuid,uuid,text,text,jsonb,text) from public, anon, authenticated;
revoke all on function public.finalize_enterprise_access_operation(uuid,uuid) from public, anon, authenticated;
revoke all on function public.control_enterprise_access_operation(uuid,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.export_enterprise_access_operation_members(uuid,uuid) from public, anon, authenticated;

grant execute on function public.create_enterprise_access_operation(uuid,text,uuid,text,integer) to service_role;
grant execute on function public.seed_enterprise_access_operation_items(uuid,integer) to service_role;
grant execute on function public.claim_enterprise_access_operation() to service_role;
grant execute on function public.claim_enterprise_access_operation_item(uuid,uuid) to service_role;
grant execute on function public.finish_enterprise_access_operation_item(uuid,uuid,text,text,jsonb,text) to service_role;
grant execute on function public.finalize_enterprise_access_operation(uuid,uuid) to service_role;
grant execute on function public.control_enterprise_access_operation(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.export_enterprise_access_operation_members(uuid,uuid) to service_role;

commit;