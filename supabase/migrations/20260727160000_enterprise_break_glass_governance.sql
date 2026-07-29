begin;

create table if not exists public.enterprise_break_glass_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_user_id uuid not null,
  target_membership_id uuid not null,
  requested_role text not null check (requested_role in ('admin','owner')),
  incident_reference text not null check (char_length(trim(incident_reference)) between 8 and 160),
  justification text not null check (char_length(trim(justification)) between 20 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','active','revoked','expired','rejected','review_required','closed')),
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
  constraint enterprise_break_glass_target_tenant_fk
    foreign key (organization_id, target_membership_id)
    references public.organization_members(organization_id, id) on delete restrict,
  constraint enterprise_break_glass_expiry_window
    check (expires_at is null or (activated_at is not null and expires_at > activated_at and expires_at <= activated_at + interval '4 hours'))
);

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
  unique (request_id, approver_user_id),
  foreign key (organization_id, request_id)
    references public.enterprise_break_glass_requests(organization_id, id) on delete cascade
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
  created_at timestamptz not null default now(),
  foreign key (organization_id, request_id)
    references public.enterprise_break_glass_requests(organization_id, id) on delete cascade
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
  created_at timestamptz not null default now(),
  foreign key (organization_id, request_id)
    references public.enterprise_break_glass_requests(organization_id, id) on delete cascade
);

alter table public.enterprise_break_glass_requests enable row level security;
alter table public.enterprise_break_glass_requests force row level security;
alter table public.enterprise_break_glass_approvals enable row level security;
alter table public.enterprise_break_glass_approvals force row level security;
alter table public.enterprise_break_glass_events enable row level security;
alter table public.enterprise_break_glass_events force row level security;
alter table public.enterprise_break_glass_reviews enable row level security;
alter table public.enterprise_break_glass_reviews force row level security;

revoke all on public.enterprise_break_glass_requests from anon, authenticated;
revoke all on public.enterprise_break_glass_approvals from anon, authenticated;
revoke all on public.enterprise_break_glass_events from anon, authenticated;
revoke all on public.enterprise_break_glass_reviews from anon, authenticated;
grant all on public.enterprise_break_glass_requests to service_role;
grant all on public.enterprise_break_glass_approvals to service_role;
grant all on public.enterprise_break_glass_events to service_role;
grant all on public.enterprise_break_glass_reviews to service_role;

create or replace function public.expire_enterprise_break_glass_requests(p_limit integer default 100)
returns table(request_id uuid, organization_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_limit < 1 or p_limit > 500 then
    raise exception 'invalid_limit';
  end if;

  return query
  with candidates as (
    select id
    from public.enterprise_break_glass_requests
    where status = 'active' and expires_at <= now()
    order by expires_at
    for update skip locked
    limit p_limit
  ), updated as (
    update public.enterprise_break_glass_requests r
    set status = 'review_required', updated_at = now(), review_due_at = coalesce(review_due_at, now() + interval '48 hours')
    from candidates c
    where r.id = c.id
    returning r.id, r.organization_id
  )
  select updated.id, updated.organization_id from updated;
end;
$$;

revoke all on function public.expire_enterprise_break_glass_requests(integer) from public, anon, authenticated;
grant execute on function public.expire_enterprise_break_glass_requests(integer) to service_role;

commit;
