import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const billingMigration = readFileSync(
  'supabase/migrations/20260721214000_enterprise_contract_billing_lifecycle.sql',
  'utf8',
);
const billingHardening = readFileSync(
  'supabase/migrations/20260721214100_enterprise_billing_lifecycle_hardening.sql',
  'utf8',
);
const alertMigration = readFileSync(
  'supabase/migrations/20260721214500_enterprise_usage_threshold_alerts.sql',
  'utf8',
);
const webhook = readFileSync('src/app/api/billing/webhook/route.ts', 'utf8');
const billingService = readFileSync('src/server/enterprise/billing.ts', 'utf8');
const lifecycleRoute = readFileSync(
  'src/app/api/internal/enterprise-contract-lifecycle/route.ts',
  'utf8',
);
const alertRoute = readFileSync(
  'src/app/api/internal/enterprise-usage-alerts/route.ts',
  'utf8',
);

describe('enterprise negotiated billing lifecycle', () => {
  it('adds negotiated payment methods, billing status and an immutable event ledger', () => {
    expect(billingMigration).toContain("payment_method in ('stripe_subscription','stripe_invoice','bank_transfer','manual_invoice')");
    expect(billingMigration).toContain("billing_status in ('unlinked','pending','active','paid','past_due','manual_invoice','canceled','failed')");
    expect(billingMigration).toContain('create table if not exists public.enterprise_contract_billing_events');
    expect(billingMigration).toContain('stripe_event_id text unique');
    expect(billingMigration).toContain('alter table public.enterprise_contract_billing_events force row level security');
  });

  it('uses a v2 idempotent Stripe sync and disables the superseded RPC', () => {
    expect(billingHardening).toContain('create or replace function public.sync_enterprise_contract_billing_v2_atomic');
    expect(billingHardening).toContain('where billing_event.stripe_event_id = p_event_id');
    expect(billingHardening).toContain("'duplicate'::text");
    expect(billingHardening).toContain('v_previous_status := v_contract.status');
    expect(billingHardening).toContain('revoke all on function public.sync_enterprise_contract_billing_atomic');
    expect(billingService).toContain("'sync_enterprise_contract_billing_v2_atomic'");
  });

  it('routes Enterprise Stripe events before the self-service plan handler', () => {
    const enterpriseIndex = webhook.indexOf('await syncEnterpriseContractBillingEvent(event)');
    const selfServiceIndex = webhook.indexOf('await handleStripeWebhookEventWithRecovery(event)');
    expect(enterpriseIndex).toBeGreaterThan(-1);
    expect(selfServiceIndex).toBeGreaterThan(enterpriseIndex);
    expect(webhook).toContain('if (enterprise.matched)');
  });

  it('advances due contracts through grace, read-only and expiry under row locks', () => {
    expect(billingHardening).toContain('create or replace function public.process_enterprise_contract_lifecycle_v2_atomic');
    expect(billingHardening).toContain('for update skip locked');
    expect(billingHardening).toContain("v_next := 'grace_period'");
    expect(billingHardening).toContain("v_next := 'read_only'");
    expect(billingHardening).toContain("v_next := 'expired'");
    expect(billingHardening).toContain("'enterprise.contract_lifecycle_advanced'");
  });

  it('protects lifecycle execution with internal auth and fail-closed auth rate limiting', () => {
    expect(lifecycleRoute).toContain('enforceInternalAuthenticationRateLimit(request');
    expect(lifecycleRoute).toContain('isAuthorizedInternalCronRequest(request)');
    expect(lifecycleRoute).toContain('processEnterpriseContractLifecycle');
    expect(lifecycleRoute).toContain('noStoreJson');
  });

  it('creates 80, 90 and 100 percent alerts including queued capacity', () => {
    expect(alertMigration).toContain('threshold_percent in (80,90,100)');
    expect(alertMigration).toContain("item.status in ('queued','processing')");
    expect(alertMigration).toContain("foreach v_threshold in array array[80,90,100]");
    expect(alertMigration).toContain("'enterprise.usage_threshold_reached'");
    expect(alertMigration).toContain("'enterprise.usage_threshold_resolved'");
  });

  it('runs alert evaluation only through the protected internal scheduler', () => {
    expect(alertRoute).toContain('enforceInternalAuthenticationRateLimit(request');
    expect(alertRoute).toContain('isAuthorizedInternalCronRequest(request)');
    expect(alertRoute).toContain('evaluateAndNotifyEnterpriseUsageAlerts');
    expect(alertRoute).toContain('noStoreJson');
  });
});
