import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('enterprise billing lifecycle idempotency contract', () => {
  it('requires idempotency on all browser-created Stripe sessions', () => {
    const checkout = read('src/app/api/billing/checkout/route.ts');
    const portal = read('src/app/api/billing/portal/route.ts');
    const button = read('src/app/[locale]/dashboard/organizations/billing/billing-action-button.tsx');

    expect(checkout).toContain("scope: 'checkout'");
    expect(checkout).toContain("deriveStripeIdempotencyKey(idempotency, 'customer-create')");
    expect(checkout).toContain('const attemptToken = checkoutAttempt.attemptToken');
    expect(checkout).toContain("deriveStripeIdempotencyKey(idempotency.context, `checkout-session:${attemptToken}`)");
    expect(checkout).toContain('claimInitialCheckoutAttempt(organization.id, plan)');
    expect(portal).toContain("scope: 'portal'");
    expect(portal).toContain("deriveStripeIdempotencyKey(idempotency.context, 'portal-session')");
    expect(button).toContain('crypto.randomUUID()');
    expect(button).toContain("const BILLING_IDEMPOTENCY_HEADER = 'Idempotency-Key'");
  });

  it('serializes subscription changes through a durable protected lifecycle ledger', () => {
    const route = read('src/app/api/billing/subscription/route.ts');
    const lifecycle = read('src/server/billing/subscription-lifecycle.ts');
    const ledger = read('src/server/billing/lifecycle-request-ledger.ts');
    const migration = read('supabase/migrations/20260813102900_add_durable_billing_lifecycle_replay_contract.sql');

    expect(route).toContain("scope: 'subscription'");
    expect(route).toContain("permission: 'manage_billing'");
    expect(route).toContain('requireStepUpForRequest');
    expect(lifecycle).toContain('findCompletedBillingLifecycleReplay');
    expect(lifecycle).toContain('billingLifecycleRequestFingerprint');
    expect(lifecycle).toContain('claimBillingLifecycleRequest');
    expect(lifecycle).toContain('completeBillingLifecycleRequest');
    expect(lifecycle).toContain('failBillingLifecycleRequest');
    expect(lifecycle).toContain("deriveStripeIdempotencyKey(input.idempotency, `subscription-${input.action}`)");
    expect(ledger).toContain('request_fingerprint: input.requestFingerprint');
    expect(ledger).toContain('result_snapshot: snapshot');
    expect(ledger).toContain("status: 'processing'");
    expect(ledger).toContain('isBillingLifecycleLeaseStale');
    expect(migration).toContain('billing_lifecycle_requests_org_request_unique_idx');
    expect(migration).toContain('billing_lifecycle_requests_request_fingerprint_format');
    expect(migration).toContain('billing_lifecycle_requests_result_snapshot_shape');
  });

  it('replays a completed request before authority/provider reads and never reconstructs durable replay from current Stripe state', () => {
    const lifecycle = read('src/server/billing/subscription-lifecycle.ts');
    const replayLookup = lifecycle.indexOf('findCompletedBillingLifecycleReplay({');
    const replayReturn = lifecycle.indexOf('if (completedReplay) return replayResult(completedReplay);');
    const authorityLookup = lifecycle.indexOf('getSubscriptionAuthority(input.organizationId)');
    const stripeClient = lifecycle.indexOf('getStripeClient()');

    expect(replayLookup).toBeGreaterThan(-1);
    expect(replayReturn).toBeGreaterThan(replayLookup);
    expect(authorityLookup).toBeGreaterThan(replayReturn);
    expect(stripeClient).toBeGreaterThan(replayReturn);
    expect(lifecycle).toContain("return replayResult(getBillingLifecycleReplaySnapshot(claim.request));");
    expect(lifecycle).not.toContain('lifecycleResult({ subscription, plan: targetPlan, interval, addOns, idempotentReplay: true })');
  });

  it('fails closed on Stripe customer or tenant authority mismatch and preserves annual interval by default', () => {
    const lifecycle = read('src/server/billing/subscription-lifecycle.ts');

    expect(lifecycle).toContain('stripe_subscription_customer_mismatch');
    expect(lifecycle).toContain('stripe_subscription_organization_mismatch');
    expect(lifecycle).toContain("input.interval ? normalizeBillingInterval(input.interval) : getCurrentBillingInterval(baseItem)");
    expect(lifecycle).toContain("baseItem.price.recurring?.interval === 'year' ? 'year' : 'month'");
  });

  it('uses current Stripe state to block unsafe plan/add-on mutation and keeps reactivation explicit', () => {
    const lifecycle = read('src/server/billing/subscription-lifecycle.ts');
    const providerRetrieveIndex = lifecycle.indexOf('stripe.subscriptions.retrieve(');
    const providerStateIndex = lifecycle.indexOf('assertProviderLifecycleState(input.action, subscription);');
    const ledgerClaimIndex = lifecycle.indexOf('const claim = await claimBillingLifecycleRequest({');

    expect(providerRetrieveIndex).toBeGreaterThan(-1);
    expect(providerStateIndex).toBeGreaterThan(providerRetrieveIndex);
    expect(ledgerClaimIndex).toBeGreaterThan(providerStateIndex);
    expect(lifecycle).toContain("if (action === 'cancel') return;");
    expect(lifecycle).toContain("subscription.status !== 'active' || !subscription.cancel_at_period_end");
    expect(lifecycle).toContain("'billing_subscription_not_reactivatable'");
    expect(lifecycle).toContain("'billing_subscription_not_active'");
    expect(lifecycle).toContain("'billing_subscription_cancel_pending'");
    expect(lifecycle.match(/cancel_at_period_end: false/g) ?? []).toHaveLength(1);
  });

  it('persists provider result before audit and completes only after audit success', () => {
    const lifecycle = read('src/server/billing/subscription-lifecycle.ts');
    const ledger = read('src/server/billing/lifecycle-request-ledger.ts');

    expect(ledger).toContain("BILLING_LIFECYCLE_PHASE_PROVIDER_IN_FLIGHT = 'provider_in_flight'");
    expect(ledger).toContain("BILLING_LIFECYCLE_PHASE_PROVIDER_SUCCEEDED = 'provider_succeeded_pending_audit'");
    expect(ledger).toContain("BILLING_LIFECYCLE_PHASE_AUDIT_SUCCEEDED = 'audit_succeeded_pending_completion'");
    expect(ledger).toContain("'billing_provider_outcome_uncertain'");
    expect(ledger).toContain('expireStaleOrganizationLease');
    expect(ledger).toContain('canExpireBillingLifecycleLease');

    const providerInFlightIndex = lifecycle.indexOf('await markBillingLifecycleProviderInFlight(requestId)');
    const providerMutationIndex = lifecycle.indexOf('stripe.subscriptions.update(');
    const providerSucceededIndex = lifecycle.indexOf('await markBillingLifecycleProviderSucceeded(requestId, providerSnapshot)');
    const auditIndex = lifecycle.indexOf('const audit = await writeAuditLog({');
    const auditSucceededIndex = lifecycle.indexOf('await markBillingLifecycleAuditSucceeded(requestId)');
    const completeIndex = lifecycle.indexOf('await completeBillingLifecycleRequest(requestId)', auditSucceededIndex);

    expect(providerInFlightIndex).toBeGreaterThan(-1);
    expect(providerMutationIndex).toBeGreaterThan(providerInFlightIndex);
    expect(providerSucceededIndex).toBeGreaterThan(providerMutationIndex);
    expect(auditIndex).toBeGreaterThan(providerSucceededIndex);
    expect(auditSucceededIndex).toBeGreaterThan(auditIndex);
    expect(completeIndex).toBeGreaterThan(auditSucceededIndex);
    expect(lifecycle).toContain("claim.kind === 'audit_succeeded_recovery'");
    expect(lifecycle).toContain("claim.kind === 'provider_succeeded_recovery'");
    expect(lifecycle).toContain('durableResultSnapshot: true');
  });

  it('recovers pre-fingerprint post-provider rows only after stable intent and live provider-state verification', () => {
    const lifecycle = read('src/server/billing/subscription-lifecycle.ts');
    const ledger = read('src/server/billing/lifecycle-request-ledger.ts');

    expect(ledger).toContain("BILLING_LIFECYCLE_PHASE_LEGACY_PROVIDER_SUCCEEDED = 'legacy_provider_succeeded_pending_snapshot'");
    expect(ledger).toContain('requestIntentMatches(row, input)');
    expect(ledger).toContain('hasNewerLifecycleRequest(row)');
    expect(ledger).toContain(".eq('failure_code', 'audit_persistence_failed')");
    expect(ledger).toContain(".is('request_fingerprint', null)");
    expect(ledger).toContain('request_fingerprint: input.requestFingerprint');
    expect(ledger).toContain("kind: 'legacy_provider_succeeded_recovery'");
    expect(ledger).toContain('markBillingLifecycleLegacyProviderSucceeded');

    expect(lifecycle).toContain("claim.kind === 'legacy_provider_succeeded_recovery'");
    expect(lifecycle).toContain('assertLegacyRecoveredProviderState({');
    expect(lifecycle).toContain('await markBillingLifecycleLegacyProviderSucceeded(requestId, providerSnapshot)');
    expect(lifecycle).toContain("const providerWasAlreadyCompleted = claim.kind === 'provider_succeeded_recovery' || isLegacyProviderRecovery;");
    expect(lifecycle).toContain('legacyProviderSnapshotRecovered: isLegacyProviderRecovery');
    expect(lifecycle).toContain("throw new BillingLifecycleRequestError('billing_provider_outcome_uncertain', 409)");
  });
});
