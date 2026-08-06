-- enterprise-migration-review: approved
-- Repair legacy subscriptions tables that predate the canonical billing schema.
-- Earlier migrations used CREATE TABLE IF NOT EXISTS with `tier` in the table
-- definition, which does not add that column when the table already exists.
-- Later migrations referenced `tier` and `entitlements` directly, so production
-- environments with the legacy table could fail before reaching their backfill.

begin;

-- This migration is an additive repair, not a replacement schema bootstrap.
-- Fail closed when the expected billing table is absent so an incomplete
-- migration chain cannot be silently converted into a different schema.
do $subscriptions_guard$
begin
  if to_regclass('public.subscriptions') is null then
    raise exception 'public.subscriptions must exist before the legacy billing repair';
  end if;
end
$subscriptions_guard$;

-- Add every column used by the canonical Stripe sync and entitlement pipeline
-- before any statement references it. All columns remain nullable until the
-- deterministic backfill has completed.
alter table public.subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text,
  add column if not exists tier text,
  add column if not exists status text,
  add column if not exists current_period_end timestamptz,
  add column if not exists entitlements jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

-- Remove any historical plan constraint before canonicalizing legacy values.
alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check,
  drop constraint if exists subscriptions_tier_check;

-- Choose the highest recognized value across both legacy columns. This prevents
-- an obsolete value such as plan='free' from hiding a valid tier='professional'
-- and avoids accidentally downgrading an enterprise or business subscription.
-- Trim before comparison so legacy values such as ' enterprise ' retain access.
with normalized as (
  select
    id,
    case
      when lower(btrim(coalesce(nullif(plan, ''), ''))) = 'enterprise'
        or lower(btrim(coalesce(nullif(tier, ''), ''))) = 'enterprise'
        then 'enterprise'
      when lower(btrim(coalesce(nullif(plan, ''), ''))) = 'business'
        or lower(btrim(coalesce(nullif(tier, ''), ''))) = 'business'
        then 'business'
      when lower(btrim(coalesce(nullif(plan, ''), ''))) in ('growth', 'professional', 'pro')
        or lower(btrim(coalesce(nullif(tier, ''), ''))) in ('growth', 'professional', 'pro')
        then 'professional'
      else 'starter'
    end as canonical_plan
  from public.subscriptions
)
update public.subscriptions subscriptions
set plan = normalized.canonical_plan,
    tier = normalized.canonical_plan,
    status = coalesce(nullif(btrim(subscriptions.status), ''), 'inactive'),
    created_at = coalesce(subscriptions.created_at, now()),
    updated_at = coalesce(subscriptions.updated_at, now())
from normalized
where subscriptions.id = normalized.id;

-- Preserve non-empty custom or contract entitlements. Only absent legacy values
-- receive the canonical plan defaults.
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
updated_at = now()
where entitlements is null
   or entitlements = '{}'::jsonb;

alter table public.subscriptions
  alter column plan set default 'starter',
  alter column plan set not null,
  alter column tier set default 'starter',
  alter column tier set not null,
  alter column status set default 'inactive',
  alter column status set not null,
  alter column entitlements set default '{
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
  }'::jsonb,
  alter column entitlements set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.subscriptions
  add constraint subscriptions_plan_check
    check (plan in ('starter', 'professional', 'business', 'enterprise')) not valid,
  add constraint subscriptions_tier_check
    check (tier in ('starter', 'professional', 'business', 'enterprise')) not valid;

alter table public.subscriptions
  validate constraint subscriptions_plan_check,
  validate constraint subscriptions_tier_check;

-- These indexes also fail closed if legacy duplicates would violate the
-- canonical one-subscription-per-organization or Stripe identifier contracts.
create unique index if not exists subscriptions_organization_id_uidx
  on public.subscriptions (organization_id);

create unique index if not exists subscriptions_stripe_customer_id_uidx
  on public.subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists subscriptions_stripe_subscription_id_uidx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists subscriptions_organization_status_idx
  on public.subscriptions (organization_id, status, created_at desc);

commit;
