import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { normalizePaidCheckoutPlanId, normalizePublicCheckoutPlanId } from '@/server/billing/paid-checkout-plan';

describe('paid self-serve Checkout plan input authority', () => {
  it('permits canonical paid Essential and Professional requests', () => {
    expect(normalizePaidCheckoutPlanId('essential')).toBe('starter');
    expect(normalizePaidCheckoutPlanId('starter')).toBe('starter');
    expect(normalizePaidCheckoutPlanId('professional')).toBe('professional');
    expect(normalizePaidCheckoutPlanId('growth')).toBe('professional');
    expect(normalizePaidCheckoutPlanId('pro')).toBe('professional');
  });

  it('rejects legacy names that imply a free tier but map to €49 Essential', () => {
    for (const alias of ['free', ' FREE ', 'Free', 'basic', ' BASIC ']) {
      expect(normalizePaidCheckoutPlanId(alias)).toBeUndefined();
    }
  });

  it('rejects sales-led and unrecognized plan IDs', () => {
    for (const input of ['business', 'enterprise', 'trial', '', 'other', null, undefined, 0]) {
      expect(normalizePaidCheckoutPlanId(input)).toBeUndefined();
    }
  });

  it('checks the paid-only parser before idempotency, provider reads, checkout claims or customer creation', async () => {
    const source = await readFile(new URL('../../src/app/api/billing/checkout/route.ts', import.meta.url), 'utf8');
    const inputAuthority = source.indexOf('normalizePaidCheckoutPlanId(parsedBody.data.plan)');
    const planDeny = source.indexOf('!isSelfServePlan(normalizedPlan)');
    const idempotency = source.indexOf('readBillingIdempotencyKey(request');
    const firstPriceRead = source.indexOf('stripe.prices.retrieve(priceId');
    const checkoutClaim = source.indexOf('let checkoutAttempt = await claimInitialCheckoutAttempt');
    const customerCreate = source.indexOf('const customer = await ensureOrganizationStripeCustomer');
    expect(inputAuthority).toBeGreaterThan(-1);
    expect(planDeny).toBeGreaterThan(inputAuthority);
    expect(idempotency).toBeGreaterThan(planDeny);
    expect(firstPriceRead).toBeGreaterThan(idempotency);
    expect(checkoutClaim).toBeGreaterThan(firstPriceRead);
    expect(customerCreate).toBeGreaterThan(checkoutClaim);
    expect(source).not.toContain('normalizeBillingPlanId(parsedBody.data.plan)');
  });

  it('rejects misleading free/basic identifiers at the subscription lifecycle API boundary', async () => {
    const source = await readFile(new URL('../../src/app/api/billing/subscription/route.ts', import.meta.url), 'utf8');
    const inputNormalization = source.indexOf('const plan = parsed.data.plan ? normalizeBillingPlanId(parsed.data.plan) : undefined;');
    const paidAuthority = source.indexOf('normalizePaidCheckoutPlanId(parsed.data.plan) !== plan');
    const deny = source.indexOf("return noStoreJson({ error: 'invalid_plan' }, { status: 400 });");
    const contractAuthority = source.indexOf('getAuthoritativeSignedContractPlan(organization.id)');
    const providerMutation = source.indexOf('const result = await mutateSubscriptionLifecycle({');
    expect(inputNormalization).toBeGreaterThan(-1);
    expect(paidAuthority).toBeGreaterThan(inputNormalization);
    expect(deny).toBeGreaterThan(paidAuthority);
    expect(contractAuthority).toBeGreaterThan(deny);
    expect(providerMutation).toBeGreaterThan(contractAuthority);
    expect(source).toContain('isSelfServePlan(plan) && normalizePaidCheckoutPlanId(parsed.data.plan) !== plan');
    expect(source).toContain("return noStoreJson({ error: 'sales_assisted_plan_required' }, { status: 400 });");
  });

  it('recognizes canonical public paid and sales-assisted plans without mislabeling free/basic', () => {
    expect(normalizePublicCheckoutPlanId('essential')).toBe('starter');
    expect(normalizePublicCheckoutPlanId('growth')).toBe('professional');
    expect(normalizePublicCheckoutPlanId('business')).toBe('business');
    expect(normalizePublicCheckoutPlanId('enterprise')).toBe('enterprise');
    for (const raw of ['free', 'basic', 'FREE', '', 'trial', null, undefined, 0]) {
      expect(normalizePublicCheckoutPlanId(raw)).toBeUndefined();
    }
  });

  it('guards checkout intent, legacy link and displayed checkout before showing paid paths', async () => {
    const [intent, legacy, page] = await Promise.all([
      readFile(new URL('../../src/app/api/billing/checkout-intent/route.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../src/app/[locale]/billing/checkout/[plan]/page.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../../src/app/[locale]/checkout/page.tsx', import.meta.url), 'utf8'),
    ]);
    expect(intent).toContain('getBillingPlan(normalizePublicCheckoutPlanId(planId))');
    expect(legacy).toContain('const normalizedPlan = normalizePublicCheckoutPlanId(plan);');
    const guard = page.indexOf('if (selectedPlanId && !normalizedRequestedPlan)');
    expect(guard).toBeGreaterThan(-1);
    expect(page.indexOf('getBillingPlan(normalizedRequestedPlan)')).toBeGreaterThan(guard);
    expect(page.indexOf('await getCurrentUser()')).toBeGreaterThan(guard);
    expect(page).toContain('redirect(`/${locale}/pricing?checkout=invalid_plan`)');
  });
});
