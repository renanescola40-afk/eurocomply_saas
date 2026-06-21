-- Stripe webhook idempotency ledger for enterprise billing.
-- Safe to run more than once.

create table if not exists public.stripe_events_processed (
  id text primary key,
  type text not null,
  status text not null default 'processed' check (status in ('processing', 'processed', 'failed')),
  stripe_created_at timestamptz,
  processed_at timestamptz,
  failed_at timestamptz,
  livemode boolean not null default false,
  api_version text,
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_events_processed_type_created_idx
  on public.stripe_events_processed(type, created_at desc);

create index if not exists stripe_events_processed_status_idx
  on public.stripe_events_processed(status, created_at desc);

alter table public.stripe_events_processed enable row level security;

create or replace function public.set_stripe_events_processed_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_stripe_events_processed_updated_at on public.stripe_events_processed;
create trigger set_stripe_events_processed_updated_at
  before update on public.stripe_events_processed
  for each row
  execute function public.set_stripe_events_processed_updated_at();
