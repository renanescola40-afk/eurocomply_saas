-- Enterprise Stripe billing webhook runtime ledger hardening.
-- Records event lifecycle, organization correlation and redacted failures for paid-production evidence.

create table if not exists public.stripe_events_processed (
  id text primary key,
  type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  stripe_created_at timestamptz,
  organization_id uuid references public.organizations(id) on delete set null,
  livemode boolean not null default false,
  api_version text,
  payload jsonb not null default '{}'::jsonb,
  error text,
  processed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stripe_events_processed
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists status text not null default 'processing',
  add column if not exists processed_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists error text,
  add column if not exists stripe_created_at timestamptz,
  add column if not exists livemode boolean not null default false,
  add column if not exists api_version text,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.stripe_events_processed
  drop constraint if exists stripe_events_processed_status_check;

alter table public.stripe_events_processed
  add constraint stripe_events_processed_status_check
  check (status in ('processing', 'processed', 'failed'));

create index if not exists stripe_events_processed_org_created_idx
  on public.stripe_events_processed (organization_id, created_at desc);

create index if not exists stripe_events_processed_status_created_idx
  on public.stripe_events_processed (status, created_at desc);

create index if not exists stripe_events_processed_type_created_idx
  on public.stripe_events_processed (type, created_at desc);

create index if not exists stripe_events_processed_failed_idx
  on public.stripe_events_processed (failed_at desc)
  where status = 'failed';

-- Compatibility table name requested by the billing production checklist.
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  processed_at timestamptz,
  organization_id uuid references public.organizations(id) on delete set null,
  error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stripe_webhook_events
  add column if not exists status text not null default 'processing',
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists error text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

insert into public.stripe_webhook_events (
  id,
  type,
  status,
  processed_at,
  organization_id,
  error,
  payload,
  created_at,
  updated_at
)
select
  id,
  type,
  status,
  processed_at,
  organization_id,
  error,
  payload,
  created_at,
  updated_at
from public.stripe_events_processed
on conflict (id) do update set
  type = excluded.type,
  status = excluded.status,
  processed_at = excluded.processed_at,
  organization_id = excluded.organization_id,
  error = excluded.error,
  payload = excluded.payload,
  updated_at = now();

create index if not exists stripe_webhook_events_org_created_idx
  on public.stripe_webhook_events (organization_id, created_at desc);

create index if not exists stripe_webhook_events_status_created_idx
  on public.stripe_webhook_events (status, created_at desc);

alter table public.stripe_events_processed enable row level security;
alter table public.stripe_webhook_events enable row level security;
