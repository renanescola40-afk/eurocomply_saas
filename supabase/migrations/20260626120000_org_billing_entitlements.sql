-- Organization-scoped Stripe billing entitlements for RISCK COMPLY.
-- Safe to run more than once.

alter table public.subscriptions
  alter column plan set default 'starter';

alter table public.subscriptions
  add column if not exists entitlements jsonb not null default '{
    "users": 3,
    "documents": 40,
    "exports": 25,
    "auditLogsDays": 30,
    "aiComplianceFeatures": "core",
    "vendorRisk": false,
    "customPolicies": false,
    "prioritySupport": false
  }'::jsonb;

update public.subscriptions
set plan = case
  when lower(coalesce(plan, tier, 'starter')) in ('enterprise') then 'enterprise'
  when lower(coalesce(plan, tier, 'starter')) in ('growth', 'professional', 'pro', 'business') then 'growth'
  else 'starter'
end,
updated_at = now()
where plan is distinct from case
  when lower(coalesce(plan, tier, 'starter')) in ('enterprise') then 'enterprise'
  when lower(coalesce(plan, tier, 'starter')) in ('growth', 'professional', 'pro', 'business') then 'growth'
  else 'starter'
end;

update public.subscriptions
set tier = plan,
entitlements = case plan
  when 'enterprise' then '{
    "users": 250,
    "documents": 10000,
    "exports": "unlimited",
    "auditLogsDays": 3650,
    "aiComplianceFeatures": "enterprise",
    "vendorRisk": true,
    "customPolicies": true,
    "prioritySupport": true
  }'::jsonb
  when 'growth' then '{
    "users": 15,
    "documents": 250,
    "exports": 250,
    "auditLogsDays": 180,
    "aiComplianceFeatures": "advanced",
    "vendorRisk": true,
    "customPolicies": true,
    "prioritySupport": false
  }'::jsonb
  else '{
    "users": 3,
    "documents": 40,
    "exports": 25,
    "auditLogsDays": 30,
    "aiComplianceFeatures": "core",
    "vendorRisk": false,
    "customPolicies": false,
    "prioritySupport": false
  }'::jsonb
end,
updated_at = now();

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_plan_check check (plan in ('starter', 'growth', 'enterprise'));

create unique index if not exists subscriptions_organization_id_uidx
  on public.subscriptions(organization_id);
