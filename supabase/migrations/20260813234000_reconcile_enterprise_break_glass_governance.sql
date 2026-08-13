begin;

-- Forward-only reconciliation for the backend-only Enterprise Break-Glass
-- runtime contract. The historical 20260727160000 migration was never applied
-- in production and cannot replay cleanly because its composite foreign keys
-- reference column pairs that are not unique. This migration materializes the
-- intended tenant-safe schema under a unique execution identity without
-- rewriting historical migration records.

create extension if not exists pgcrypto;

do $membership_prerequisite$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_members') is null then
    raise exception 'organizations and organization_members must exist before break-glass reconciliation';
  end if;
end
$membership_prerequisite$;

-- Composite tenant FKs require an explicit unique parent key. `id` is already a
-- primary key, so this does not change row uniqueness; it only makes the tenant
-- pair a valid referenced key and prevents a request from targeting a membership
-- from another organization.
do $membership_tenant_key$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_organization_id_id_key'
      and contype = 'u'
  ) then
    alter table public.organization_members
      add constraint organization_members_organization_id_id_key
      unique (organization_id, id);
  end if;
end
$membership_tenant_key$;

create table if not exists public.enterprise_break_glass_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_user_id uuid not null,
  target_membership_id uuid not null,
  requested_role text not null check (requested_role in ('admin','owner')),
  incident_reference text not null check (char_length(trim(incident_reference)) between 8 and 160),
  justification text not null check (char_length(trim(justification)) between 20 and 2000),
  status text not null default 'pending' check (
    status in ('pending','approved','active','revoked','expired','rejected','review_required','closed')
  ),
  requested_minutes integer not null check (requested_minutes between 15 and 240),
  approvals_required integer not null default 2 check (approvals_required between 2 and 3),
  approvals_received integer not null default 0 check (approvals_received >= 0),
  activated_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  review_due_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enterprise_break_glass_expiry_window
    check (
      expires_at is null
      or (
        activated_at is not null
        and expires_at > activated_at
        and expires_at <= activated_at + interval '4 hours'
      )
    )
);

-- Reconcile keys separately so partially-created non-production schemas converge.
do $request_constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_requests'::regclass
      and conname = 'enterprise_break_glass_requests_organization_id_id_key'
      and contype = 'u'
  ) then
    alter table public.enterprise_break_glass_requests
      add constraint enterprise_break_glass_requests_organization_id_id_key
      unique (organization_id, id);
  end if;

  alter table public.enterprise_break_glass_requests
    drop constraint if exists enterprise_break_glass_target_tenant_fk;
  alter table public.enterprise_break_glass_requests
    add constraint enterprise_break_glass_target_tenant_fk
      foreign key (organization_id, target_membership_id)
      references public.organization_members(organization_id, id)
      on delete restrict;
end
$request_constraints$;

create unique index if not exists enterprise_break_glass_one_open_target
  on public.enterprise_break_glass_requests (organization_id, target_membership_id)
  where status in ('pending','approved','active','review_required');

create table if not exists public.enterprise_break_glass_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  request_id uuid not null,
  approver_user_id uuid not null,
  decision text not null check (decision in ('approved','rejected')),
  rationale text not null check (char_length(trim(rationale)) between 8 and 1000),
  created_at timestamptz not null default now(),
  unique (request_id, approver_user_id)
);

create table if not exists public.enterprise_break_glass_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  request_id uuid not null,
  event_type text not null,
  actor_user_id uuid,
  evidence jsonb not null default '{}'::jsonb,
  previous_event_hash text,
  event_hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists enterprise_break_glass_event_hash_unique
  on public.enterprise_break_glass_events(request_id, event_hash);

create table if not exists public.enterprise_break_glass_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  request_id uuid not null unique,
  reviewer_user_id uuid,
  outcome text check (outcome in ('appropriate','partially_appropriate','inappropriate')),
  findings text,
  remediation text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Every child row is bound to the same tenant as its parent request.
-- Drop/recreate named constraints so partially applied non-production schemas
-- converge on the exact contract.
alter table public.enterprise_break_glass_approvals
  drop constraint if exists enterprise_break_glass_approvals_request_tenant_fk;
alter table public.enterprise_break_glass_approvals
  add constraint enterprise_break_glass_approvals_request_tenant_fk
    foreign key (organization_id, request_id)
    references public.enterprise_break_glass_requests(organization_id, id)
    on delete cascade;

alter table public.enterprise_break_glass_events
  drop constraint if exists enterprise_break_glass_events_request_tenant_fk;
alter table public.enterprise_break_glass_events
  add constraint enterprise_break_glass_events_request_tenant_fk
    foreign key (organization_id, request_id)
    references public.enterprise_break_glass_requests(organization_id, id)
    on delete cascade;

alter table public.enterprise_break_glass_reviews
  drop constraint if exists enterprise_break_glass_reviews_request_tenant_fk;
alter table public.enterprise_break_glass_reviews
  add constraint enterprise_break_glass_reviews_request_tenant_fk
    foreign key (organization_id, request_id)
    references public.enterprise_break_glass_requests(organization_id, id)
    on delete cascade;

alter table public.enterprise_break_glass_requests enable row level security;
alter table public.enterprise_break_glass_requests force row level security;
alter table public.enterprise_break_glass_approvals enable row level security;
alter table public.enterprise_break_glass_approvals force row level security;
alter table public.enterprise_break_glass_events enable row level security;
alter table public.enterprise_break_glass_events force row level security;
alter table public.enterprise_break_glass_reviews enable row level security;
alter table public.enterprise_break_glass_reviews force row level security;

-- Break-Glass persistence is backend-only. Browser access would bypass the
-- route-level RBAC, trusted mutation, rate-limit, Step-Up and audit boundaries.
revoke all on table public.enterprise_break_glass_requests from public, anon, authenticated;
revoke all on table public.enterprise_break_glass_approvals from public, anon, authenticated;
revoke all on table public.enterprise_break_glass_events from public, anon, authenticated;
revoke all on table public.enterprise_break_glass_reviews from public, anon, authenticated;
grant all on table public.enterprise_break_glass_requests to service_role;
grant all on table public.enterprise_break_glass_approvals to service_role;
grant all on table public.enterprise_break_glass_events to service_role;
grant all on table public.enterprise_break_glass_reviews to service_role;

create or replace function public.expire_enterprise_break_glass_requests(p_limit integer default 100)
returns table(request_id uuid, organization_id uuid)
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_limit < 1 or p_limit > 500 then
    raise exception 'invalid_limit';
  end if;

  return query
  with candidates as (
    select request.id
    from public.enterprise_break_glass_requests as request
    where request.status = 'active'
      and request.expires_at <= now()
    order by request.expires_at
    for update skip locked
    limit p_limit
  ), updated as (
    update public.enterprise_break_glass_requests as request
    set status = 'review_required',
        updated_at = now(),
        review_due_at = coalesce(request.review_due_at, now() + interval '48 hours')
    from candidates
    where request.id = candidates.id
    returning request.id, request.organization_id
  )
  select updated.id, updated.organization_id
  from updated;
end;
$$;

revoke all on function public.expire_enterprise_break_glass_requests(integer) from public, anon, authenticated;
grant execute on function public.expire_enterprise_break_glass_requests(integer) to service_role;

do $verify$
declare
  expiry_function oid := to_regprocedure('public.expire_enterprise_break_glass_requests(integer)');
  rls_count integer;
  browser_table_privileges integer;
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_organization_id_id_key'
      and contype = 'u'
  ) then
    raise exception 'organization_members tenant composite key is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_requests'::regclass
      and conname = 'enterprise_break_glass_requests_organization_id_id_key'
      and contype = 'u'
  ) then
    raise exception 'break-glass request tenant composite key is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_requests'::regclass
      and conname = 'enterprise_break_glass_target_tenant_fk'
      and contype = 'f'
  ) then
    raise exception 'break-glass target tenant foreign key is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_approvals'::regclass
      and conname = 'enterprise_break_glass_approvals_request_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_events'::regclass
      and conname = 'enterprise_break_glass_events_request_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enterprise_break_glass_reviews'::regclass
      and conname = 'enterprise_break_glass_reviews_request_tenant_fk'
      and contype = 'f'
  ) then
    raise exception 'break-glass child tenant foreign keys are incomplete';
  end if;

  select count(*)
  into rls_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'enterprise_break_glass_requests',
      'enterprise_break_glass_approvals',
      'enterprise_break_glass_events',
      'enterprise_break_glass_reviews'
    )
    and c.relrowsecurity
    and c.relforcerowsecurity;

  if rls_count <> 4 then
    raise exception 'break-glass RLS/FORCE RLS boundary is incomplete';
  end if;

  select count(*)
  into browser_table_privileges
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'enterprise_break_glass_requests',
      'enterprise_break_glass_approvals',
      'enterprise_break_glass_events',
      'enterprise_break_glass_reviews'
    )
    and grantee in ('anon','authenticated');

  if browser_table_privileges <> 0 then
    raise exception 'browser roles unexpectedly retain break-glass table privileges';
  end if;

  if expiry_function is null then
    raise exception 'break-glass expiry function is missing';
  end if;

  if has_function_privilege('anon', expiry_function, 'EXECUTE')
     or has_function_privilege('authenticated', expiry_function, 'EXECUTE')
     or not has_function_privilege('service_role', expiry_function, 'EXECUTE') then
    raise exception 'break-glass expiry function privileges are not canonical';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = expiry_function
      and p.prosecdef
      and setting = 'search_path=pg_catalog'
  ) then
    raise exception 'break-glass expiry function security configuration is not fixed';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
