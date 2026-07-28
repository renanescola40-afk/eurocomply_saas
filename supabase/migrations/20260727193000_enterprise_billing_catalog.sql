begin;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('starter','professional','business','enterprise')),
  name text not null,
  monthly_price_cents integer,
  annual_price_cents integer,
  currency text not null default 'eur',
  sales_led boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  limit_value bigint,
  limit_unit text,
  created_at timestamptz not null default now(),
  unique (plan_id, feature_key)
);

create table if not exists public.add_ons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  annual_price_cents integer not null check (annual_price_cents >= 0),
  currency text not null default 'eur',
  category text not null,
  available_plans text[] not null default '{}',
  dependencies text[] not null default '{}',
  status text not null default 'active' check (status in ('active','private_preview','retired')),
  stripe_product_id text,
  stripe_monthly_price_id text,
  stripe_annual_price_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Preserve the existing add-on authority used by checkout and entitlement code.
-- The optional catalog reference lets the persistent catalog be adopted without
-- creating a second customer add-on table that could diverge.
alter table public.organization_add_ons
  add column if not exists catalog_add_on_id uuid references public.add_ons(id) on delete set null;

create index if not exists organization_add_ons_catalog_add_on_idx
  on public.organization_add_ons (catalog_add_on_id)
  where catalog_add_on_id is not null;

create table if not exists public.seat_usage (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  active_seats integer not null default 0 check (active_seats >= 0),
  included_seats integer not null default 0 check (included_seats >= 0),
  purchased_seats integer not null default 0 check (purchased_seats >= 0),
  measured_at timestamptz not null default now()
);

-- organization_usage already exists in the Enterprise licensing core. Extend it
-- additively instead of relying on CREATE TABLE IF NOT EXISTS, which would skip
-- all new columns on an existing production database.
alter table public.organization_usage
  add column if not exists organizations_used integer not null default 1,
  add column if not exists ai_systems_used integer not null default 0,
  add column if not exists documents_used integer not null default 0,
  add column if not exists api_requests_used bigint not null default 0,
  add column if not exists webhooks_used bigint not null default 0,
  add column if not exists exports_used bigint not null default 0,
  add column if not exists period_start timestamptz not null default date_trunc('month', now()),
  add column if not exists measured_at timestamptz not null default now();

update public.organization_usage
set ai_systems_used = greatest(ai_systems_used, ai_systems),
    api_requests_used = greatest(api_requests_used, api_requests),
    measured_at = greatest(measured_at, coalesce(updated_at, measured_at));

create table if not exists public.storage_usage (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  bytes_used bigint not null default 0 check (bytes_used >= 0),
  measured_at timestamptz not null default now()
);

insert into public.storage_usage (organization_id, bytes_used, measured_at)
select organization_id, storage_bytes, coalesce(updated_at, now())
from public.organization_usage
on conflict (organization_id) do update set
  bytes_used = greatest(public.storage_usage.bytes_used, excluded.bytes_used),
  measured_at = greatest(public.storage_usage.measured_at, excluded.measured_at);

create table if not exists public.billing_limits (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  limit_key text not null,
  included_value bigint,
  purchased_value bigint not null default 0 check (purchased_value >= 0),
  unlimited boolean not null default false,
  source text not null default 'plan' check (source in ('plan','add_on','contract','manual')),
  updated_at timestamptz not null default now(),
  primary key (organization_id, limit_key)
);

create table if not exists public.feature_flags (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null,
  source text not null default 'plan' check (source in ('plan','add_on','contract','manual','rollout')),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, feature_key)
);

alter table public.plans enable row level security;
alter table public.plan_features enable row level security;
alter table public.add_ons enable row level security;

alter table public.plans force row level security;
alter table public.plan_features force row level security;
alter table public.add_ons force row level security;

-- Billing state is authoritative server-side data. Organization members may read
-- their own rows, while inserts, updates and deletes are denied to authenticated
-- browser clients and remain available only to the privileged backend role.
select public.app_rls_harden_backend_only_table('organization_add_ons');
select public.app_rls_harden_backend_only_table('seat_usage');
select public.app_rls_harden_backend_only_table('organization_usage');
select public.app_rls_harden_backend_only_table('storage_usage');
select public.app_rls_harden_backend_only_table('billing_limits');
select public.app_rls_harden_backend_only_table('feature_flags');

-- Canonicalize legacy plan identifiers before replacing the old three-tier
-- constraint. Stripe webhooks persist professional and business directly.
alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

update public.subscriptions
set plan = case
      when lower(coalesce(plan, tier, 'starter')) = 'enterprise' then 'enterprise'
      when lower(coalesce(plan, tier, 'starter')) = 'business' then 'business'
      when lower(coalesce(plan, tier, 'starter')) in ('growth', 'professional', 'pro') then 'professional'
      else 'starter'
    end,
    tier = case
      when lower(coalesce(plan, tier, 'starter')) = 'enterprise' then 'enterprise'
      when lower(coalesce(plan, tier, 'starter')) = 'business' then 'business'
      when lower(coalesce(plan, tier, 'starter')) in ('growth', 'professional', 'pro') then 'professional'
      else 'starter'
    end,
    updated_at = now();

alter table public.subscriptions
  add constraint subscriptions_plan_check
  check (plan in ('starter', 'professional', 'business', 'enterprise'));

update public.subscriptions
set entitlements = case plan
  when 'enterprise' then '{
    "users": 9007199254740991,
    "documents": 9007199254740991,
    "vendors": 9007199254740991,
    "risks": 9007199254740991,
    "organizations": "unlimited",
    "aiSystems": "unlimited",
    "storageGb": "unlimited",
    "apiRequestsMonthly": "unlimited",
    "webhooks": "unlimited",
    "exportsMonthly": "unlimited",
    "auditLogsDays": 3650
  }'::jsonb
  when 'business' then '{
    "users": 75,
    "documents": 10000,
    "vendors": 150,
    "risks": 300,
    "organizations": 3,
    "aiSystems": 1500,
    "storageGb": 500,
    "apiRequestsMonthly": 100000,
    "webhooks": 100,
    "exportsMonthly": 5000,
    "auditLogsDays": 730
  }'::jsonb
  when 'professional' then '{
    "users": 15,
    "documents": 1000,
    "vendors": 30,
    "risks": 75,
    "organizations": 1,
    "aiSystems": 250,
    "storageGb": 100,
    "apiRequestsMonthly": 10000,
    "webhooks": 10,
    "exportsMonthly": 500,
    "auditLogsDays": 180
  }'::jsonb
  else '{
    "users": 3,
    "documents": 100,
    "vendors": 5,
    "risks": 25,
    "organizations": 1,
    "aiSystems": 25,
    "storageGb": 10,
    "apiRequestsMonthly": 0,
    "webhooks": 0,
    "exportsMonthly": 25,
    "auditLogsDays": 30
  }'::jsonb
end,
updated_at = now();

insert into public.plans (slug, name, monthly_price_cents, annual_price_cents, sales_led)
values
  ('starter','Starter',4900,49000,false),
  ('professional','Professional',19900,199000,false),
  ('business','Business',69900,699000,true),
  ('enterprise','Enterprise',null,null,true)
on conflict (slug) do update set
  name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  annual_price_cents = excluded.annual_price_cents,
  sales_led = excluded.sales_led,
  updated_at = now();

commit;
