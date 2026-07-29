begin;

create table if not exists public.billing_lifecycle_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null,
  action text not null check (action in ('upgrade','downgrade','cancel','reactivate','replace_add_ons')),
  source_plan text,
  target_plan text,
  billing_interval text check (billing_interval in ('month','year')),
  add_ons jsonb not null default '[]'::jsonb,
  stripe_subscription_id text,
  stripe_request_id text,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','cancelled')),
  failure_code text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists billing_lifecycle_requests_org_created_idx
  on public.billing_lifecycle_requests (organization_id, requested_at desc);

create unique index if not exists billing_lifecycle_requests_one_processing_idx
  on public.billing_lifecycle_requests (organization_id)
  where status in ('pending','processing');

alter table public.billing_lifecycle_requests enable row level security;
alter table public.billing_lifecycle_requests force row level security;

revoke all on public.billing_lifecycle_requests from anon, authenticated;
grant all on public.billing_lifecycle_requests to service_role;

comment on table public.billing_lifecycle_requests is
  'Append-oriented operational evidence for Stripe subscription lifecycle mutations. Browser clients have no direct access.';

commit;
