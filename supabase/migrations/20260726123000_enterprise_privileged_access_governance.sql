create table if not exists public.enterprise_privileged_access_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_user_id uuid not null,
  target_membership_id uuid not null,
  requested_role text not null check (requested_role in ('admin','owner')),
  justification text not null check (char_length(justification) between 12 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','active','rejected','revoked','expired','cancelled')),
  required_approvals integer not null default 2 check (required_approvals between 1 and 3),
  approval_count integer not null default 0 check (approval_count between 0 and 3),
  starts_at timestamptz,
  expires_at timestamptz not null,
  activated_at timestamptz,
  revoked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint privileged_access_expiry_window check (expires_at > created_at and expires_at <= created_at + interval '24 hours')
);

create table if not exists public.enterprise_privileged_access_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid not null references public.enterprise_privileged_access_requests(id) on delete cascade,
  approver_user_id uuid not null,
  decision text not null check (decision in ('approved','rejected')),
  reason text not null check (char_length(reason) between 8 and 500),
  created_at timestamptz not null default now(),
  unique (request_id, approver_user_id)
);

create table if not exists public.enterprise_privileged_access_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid not null references public.enterprise_privileged_access_requests(id) on delete cascade,
  actor_user_id uuid,
  event_type text not null check (event_type in ('requested','approved','rejected','activated','revoked','expired','cancelled','activation_failed','revocation_failed')),
  reason_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists enterprise_privileged_access_one_active_target
  on public.enterprise_privileged_access_requests (organization_id, target_membership_id)
  where status in ('pending','approved','active');
create index if not exists enterprise_privileged_access_expiry_queue
  on public.enterprise_privileged_access_requests (expires_at)
  where status = 'active';
create index if not exists enterprise_privileged_access_events_request
  on public.enterprise_privileged_access_events (organization_id, request_id, created_at);

alter table public.enterprise_privileged_access_requests enable row level security;
alter table public.enterprise_privileged_access_requests force row level security;
alter table public.enterprise_privileged_access_approvals enable row level security;
alter table public.enterprise_privileged_access_approvals force row level security;
alter table public.enterprise_privileged_access_events enable row level security;
alter table public.enterprise_privileged_access_events force row level security;

revoke all on public.enterprise_privileged_access_requests from public, anon, authenticated;
revoke all on public.enterprise_privileged_access_approvals from public, anon, authenticated;
revoke all on public.enterprise_privileged_access_events from public, anon, authenticated;
grant select, insert, update on public.enterprise_privileged_access_requests to service_role;
grant select, insert on public.enterprise_privileged_access_approvals to service_role;
grant select, insert on public.enterprise_privileged_access_events to service_role;

create or replace function public.expire_enterprise_privileged_access(p_limit integer default 100)
returns table(request_id uuid, organization_id uuid, target_membership_id uuid)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with expired as (
    select id from public.enterprise_privileged_access_requests
    where status = 'active' and expires_at <= now()
    order by expires_at asc
    for update skip locked
    limit least(greatest(p_limit, 1), 500)
  ), updated as (
    update public.enterprise_privileged_access_requests r
    set status = 'expired', completed_at = now(), updated_at = now()
    from expired e where r.id = e.id
    returning r.id, r.organization_id, r.target_membership_id
  )
  select * from updated;
end; $$;
revoke all on function public.expire_enterprise_privileged_access(integer) from public, anon, authenticated;
grant execute on function public.expire_enterprise_privileged_access(integer) to service_role;