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

create table if not exists public.customer_add_ons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  add_on_id uuid not null references public.add_ons(id),
  status text not null check (status in ('trialing','active','past_due','canceled')),
  quantity integer not null default 1 check (quantity > 0),
  stripe_subscription_item_id text,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, add_on_id)
);

create table if not exists public.seat_usage (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  active_seats integer not null default 0 check (active_seats >= 0),
  included_seats integer not null default 0 check (included_seats >= 0),
  purchased_seats integer not null default 0 check (purchased_seats >= 0),
  measured_at timestamptz not null default now()
);

create table if not exists public.organization_usage (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  organizations_used integer not null default 1 check (organizations_used >= 0),
  ai_systems_used integer not null default 0 check (ai_systems_used >= 0),
  documents_used integer not null default 0 check (documents_used >= 0),
  api_requests_used bigint not null default 0 check (api_requests_used >= 0),
  webhooks_used bigint not null default 0 check (webhooks_used >= 0),
  exports_used bigint not null default 0 check (exports_used >= 0),
  period_start timestamptz not null default date_trunc('month', now()),
  measured_at timestamptz not null default now()
);

create table if not exists public.storage_usage (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  bytes_used bigint not null default 0 check (bytes_used >= 0),
  measured_at timestamptz not null default now()
);

create table if not exists public.billing_limits (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  limit_key text not null,
  included_value bigint,
  purchased_value bigint not null default 0,
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
select public.app_rls_harden_backend_only_table('customer_add_ons');
select public.app_rls_harden_backend_only_table('seat_usage');
select public.app_rls_harden_backend_only_table('organization_usage');
select public.app_rls_harden_backend_only_table('storage_usage');
select public.app_rls_harden_backend_only_table('billing_limits');
select public.app_rls_harden_backend_only_table('feature_flags');

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
