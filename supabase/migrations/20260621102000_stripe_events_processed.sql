create table if not exists public.stripe_events_processed (
  id text primary key,
  type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed')),
  stripe_created_at timestamptz not null,
  livemode boolean not null default false,
  api_version text,
  payload jsonb not null default '{}'::jsonb,
  error text,
  processed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.stripe_events_processed (
  id,
  type,
  status,
  stripe_created_at,
  livemode,
  payload,
  processed_at,
  created_at,
  updated_at
)
select
  id,
  type,
  'processed',
  processed_at,
  false,
  payload,
  processed_at,
  processed_at,
  now()
from public.stripe_webhook_events
on conflict (id) do nothing;

create index if not exists stripe_events_processed_status_idx
  on public.stripe_events_processed (status);

create index if not exists stripe_events_processed_stripe_created_at_idx
  on public.stripe_events_processed (stripe_created_at desc);

create index if not exists stripe_events_processed_failed_at_idx
  on public.stripe_events_processed (failed_at desc)
  where status = 'failed';

alter table public.stripe_events_processed enable row level security;
