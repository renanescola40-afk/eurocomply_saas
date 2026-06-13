-- Organization add-ons persistence for paid monthly add-ons.
-- Safe to run after the base organizations/subscriptions schema exists.

create table if not exists public.organization_add_ons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  add_on_id text not null,
  status text not null default 'inactive',
  stripe_subscription_item_id text,
  stripe_price_id text,
  quantity integer not null default 1,
  current_period_start timestamptz,
  current_period_end timestamptz,
  activated_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_add_ons_status_check check (status in ('inactive', 'active', 'trialing', 'past_due', 'cancelled')),
  constraint organization_add_ons_quantity_check check (quantity > 0),
  constraint organization_add_ons_unique_org_addon unique (organization_id, add_on_id)
);

create index if not exists organization_add_ons_org_status_idx
  on public.organization_add_ons (organization_id, status);

create index if not exists organization_add_ons_stripe_subscription_item_idx
  on public.organization_add_ons (stripe_subscription_item_id)
  where stripe_subscription_item_id is not null;

alter table public.organization_add_ons enable row level security;

create policy if not exists "organization members can read add-ons"
  on public.organization_add_ons
  for select
  using (
    exists (
      select 1
      from public.organization_members members
      where members.organization_id = organization_add_ons.organization_id
        and members.user_id = auth.uid()
    )
  );

create trigger if not exists organization_add_ons_set_updated_at
  before update on public.organization_add_ons
  for each row
  execute function public.set_updated_at();
