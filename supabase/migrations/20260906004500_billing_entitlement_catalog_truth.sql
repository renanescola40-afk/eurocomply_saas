begin;

-- Commercial-truth reconciliation for persisted self-service entitlement JSON.
-- The implemented machine API/webhook control plane is Enterprise-only, and the
-- current billing model licenses one organization per subscription/contract.
-- Remove stale lower-plan capacity promises without changing plan price/status.

do $prerequisites$
begin
  if to_regclass('public.subscriptions') is null then
    raise exception 'subscriptions table is required for billing entitlement reconciliation';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='subscriptions' and column_name='entitlements'
  ) then
    raise exception 'subscriptions.entitlements is required for billing entitlement reconciliation';
  end if;
end
$prerequisites$;

update public.subscriptions subscription
set entitlements =
  jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(subscription.entitlements, '{}'::jsonb),
        '{organizations}',
        case
          when lower(coalesce(subscription.plan, subscription.tier, '')) = 'enterprise' then '"unlimited"'::jsonb
          else '1'::jsonb
        end,
        true
      ),
      '{apiRequestsMonthly}',
      case
        when lower(coalesce(subscription.plan, subscription.tier, '')) = 'enterprise' then '"unlimited"'::jsonb
        else '0'::jsonb
      end,
      true
    ),
    '{webhooks}',
    case
      when lower(coalesce(subscription.plan, subscription.tier, '')) = 'enterprise' then '"unlimited"'::jsonb
      else '0'::jsonb
    end,
    true
  ),
  updated_at = now()
where lower(coalesce(subscription.plan, subscription.tier, '')) in (
  'starter','essential','basic','professional','pro','growth','business','enterprise'
);

-- Keep the default for newly-created compatibility rows fail-closed. Stripe
-- webhook synchronization later replaces the full entitlement document from the
-- canonical server catalog after trusted commercial authority is established.
alter table public.subscriptions
  alter column entitlements set default '{
    "users": 3,
    "documents": 100,
    "vendors": 0,
    "risks": 0,
    "organizations": 1,
    "aiSystems": 25,
    "storageGb": 10,
    "apiRequestsMonthly": 0,
    "webhooks": 0,
    "exportsMonthly": 25,
    "auditLogsDays": 30
  }'::jsonb;

commit;
