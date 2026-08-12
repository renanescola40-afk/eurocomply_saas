import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { billingLifecycleRequestFingerprint } from '../../src/server/billing/subscription-lifecycle';

const lifecyclePath = 'src/server/billing/subscription-lifecycle.ts';
const ledgerPath = 'src/server/billing/lifecycle-request-ledger.ts';

describe('billing lifecycle durable replay contract', () => {
  it('creates stable request fingerprints across add-on ordering and separates changed intent', () => {
    const first = billingLifecycleRequestFingerprint({
      action: 'upgrade',
      plan: 'business',
      interval: 'year',
      addOns: [
        { slug: 'advanced-reports', quantity: 2 },
        { slug: 'extra-ai-inventory', quantity: 1 },
      ],
    });
    const reordered = billingLifecycleRequestFingerprint({
      action: 'upgrade',
      plan: 'business',
      interval: 'year',
      addOns: [
        { slug: 'extra-ai-inventory', quantity: 1 },
        { slug: 'ADVANCED-REPORTS', quantity: 2 },
      ],
    });
    const changedPlan = billingLifecycleRequestFingerprint({
      action: 'upgrade',
      plan: 'enterprise',
      interval: 'year',
      addOns: [
        { slug: 'advanced-reports', quantity: 2 },
        { slug: 'extra-ai-inventory', quantity: 1 },
      ],
    });

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(reordered).toBe(first);
    expect(changedPlan).not.toBe(first);
  });

  it('checks a completed durable replay before subscription authority or Stripe provider reads', () => {
    const source = readFileSync(lifecyclePath, 'utf8');
    const replayLookup = source.indexOf('findCompletedBillingLifecycleReplay({');
    const authorityLookup = source.indexOf('getSubscriptionAuthority(input.organizationId)');
    const stripeClient = source.indexOf('getStripeClient()');

    expect(replayLookup).toBeGreaterThan(0);
    expect(authorityLookup).toBeGreaterThan(replayLookup);
    expect(stripeClient).toBeGreaterThan(replayLookup);
    expect(source).toContain('if (completedReplay) return replayResult(completedReplay);');
  });

  it('never reconstructs a completed replay from current Stripe state', () => {
    const source = readFileSync(lifecyclePath, 'utf8');

    expect(source).toContain("if (claim.kind === 'completed_replay')");
    expect(source).toContain('return replayResult(getBillingLifecycleReplaySnapshot(claim.request));');
    expect(source).not.toContain('lifecycleResult({ subscription, plan: targetPlan, interval, addOns, idempotentReplay: true })');
  });

  it('persists a sanitized result snapshot only after audit persistence succeeds', () => {
    const source = readFileSync(lifecyclePath, 'utf8');
    const auditGate = source.indexOf('if (!audit.persisted)');
    const completion = source.indexOf('completeBillingLifecycleRequest(requestId, replaySnapshotFromResult(result))');

    expect(auditGate).toBeGreaterThan(0);
    expect(completion).toBeGreaterThan(auditGate);
    expect(source).toContain('subscriptionId: result.subscriptionId');
    expect(source).toContain('cancelAtPeriodEnd: result.cancelAtPeriodEnd');
    expect(source).toContain('currentPeriodEnd: result.currentPeriodEnd');
    expect(source).toContain('addOns: result.addOns');
  });

  it('requires request fingerprint equality before replaying or reclaiming the same digest', () => {
    const ledger = readFileSync(ledgerPath, 'utf8');

    expect(ledger).toContain('request_fingerprint: string | null');
    expect(ledger).toContain('result_snapshot: unknown');
    expect(ledger).toContain('row.request_fingerprint !== input.requestFingerprint');
    expect(ledger).toContain("throw new BillingLifecycleRequestError('billing_idempotency_conflict', 409)");
    expect(ledger).toContain('request_fingerprint: input.requestFingerprint');
    expect(ledger).toContain('result_snapshot: null');
    expect(ledger).toContain('result_snapshot: {');
  });
});
