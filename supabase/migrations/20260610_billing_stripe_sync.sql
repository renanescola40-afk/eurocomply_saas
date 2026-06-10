-- Stripe billing sync for EuroComply public launch.
-- Safe to run more than once.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan text not null default 'essential',
  tier text,
  status text not null default 'inactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz;

create unique index if not exists subscriptions_stripe_subscription_id_uidx
  on public.subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists subscriptions_organization_status_idx
  on public.subscriptions(organization_id, status, created_at desc);

alter table public.subscriptions enable row level security;

drop policy if exists "Organization members can read subscriptions" on public.subscriptions;
create policy "Organization members can read subscriptions"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = subscriptions.organization_id
      and om.user_id = auth.uid()
    )
  );
