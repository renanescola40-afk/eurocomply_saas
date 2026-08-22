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
const v19Billing = readFileSync(
  'supabase/migrations/20260822123558_v19_reconcile_enterprise_billing_lifecycle.sql',
  'utf8',
);
const v19FinalBillingBoundary = readFileSync(
  'supabase/migrations/20260822123600_v19_finalize_enterprise_contract_mode_compatibility.sql',
  'utf8',
);
const alertMigration = readFileSync(
  'supabase/migrations/20260721214500_enterprise_usage_threshold_alerts.sql',
  'utf8',
);
const canonicalWebhook = readFileSync('src/app/api/stripe/webhook/route.ts', 'utf8');
const legacyWebhook = readFileSync('src/app/api/billing/webhook/route.ts', 'utf8');
const platformBillingRoute = readFileSync('src/app/api/platform/contracts/billing/route.ts', 'utf8');
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

  it('preserves the idempotent v2 implementation behind a strict V19 v3 binding boundary', () => {
    expect(billingHardening).toContain('create or replace function public.sync_enterprise_contract_billing_v2_atomic');
    expect(billingHardening).toContain('where billing_event.stripe_event_id = p_event_id');
    expect(billingHardening).toContain("'duplicate'::text");
    expect(v19Billing).toContain('create or replace function public.sync_enterprise_contract_billing_v2_atomic');
    expect(v19FinalBillingBoundary).toContain('create or replace function public.sync_enterprise_contract_billing_v3_atomic');
    expect(billingService).toContain("'sync_enterprise_contract_billing_v3_atomic'");

    const v3Start = v19FinalBillingBoundary.indexOf(
      'create or replace function public.sync_enterprise_contract_billing_v3_atomic',
    );
    const configureStart = v19FinalBillingBoundary.indexOf(
      'create or replace function public.configure_enterprise_contract_billing_v2_atomic',
    );
    const v3Definition = v19FinalBillingBoundary.slice(v3Start, configureStart);

    expect(v3Definition).toContain('p_contract_id is not null');
    expect(v3Definition).toContain('contract.stripe_subscription_id=p_stripe_subscription_id');
    expect(v3Definition).not.toContain(
      "p_organization_id is not null\n        and contract.organization_id=p_organization_id",
    );
    expect(v19FinalBillingBoundary).toContain(
      'from public,anon,authenticated,service_role',
    );
    expect(v19FinalBillingBoundary).toContain(
      'grant execute on function public.sync_enterprise_contract_billing_v3_atomic',
    );
  });

  it('routes Enterprise Stripe events first on the canonical LIVE webhook', () => {
    const enterpriseIndex = canonicalWebhook.indexOf('await syncEnterpriseContractBillingEvent(event)');
    const invoiceSyncIndex = canonicalWebhook.indexOf('await syncStripeSubscriptionForInvoiceEvent(event)');
    const selfServiceIndex = canonicalWebhook.indexOf('await handleStripeWebhookEventWithRecovery(event)');

    expect(enterpriseIndex).toBeGreaterThan(-1);
    expect(invoiceSyncIndex).toBeGreaterThan(enterpriseIndex);
    expect(selfServiceIndex).toBeGreaterThan(invoiceSyncIndex);
    expect(canonicalWebhook).toContain('if (enterprise.matched)');
    expect(canonicalWebhook).toContain("reason: 'enterprise_billing_sync_failed'");
    expect(legacyWebhook).toContain('await syncEnterpriseContractBillingEvent(event)');
  });

  it('materializes and consumes the negotiated-only Platform billing configuration RPC', () => {
    expect(v19FinalBillingBoundary).toContain(
      'create or replace function public.configure_enterprise_contract_billing_v2_atomic',
    );
    expect(v19FinalBillingBoundary).toContain("contract.contract_mode='negotiated'");
    expect(v19FinalBillingBoundary).toContain(
      'grant execute on function public.configure_enterprise_contract_billing_v2_atomic',
    );
    expect(platformBillingRoute).toContain("client.rpc('configure_enterprise_contract_billing_v2_atomic'");
    expect(platformBillingRoute).not.toContain("client.rpc('configure_enterprise_contract_billing_atomic'");
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
