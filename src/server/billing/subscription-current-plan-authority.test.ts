import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { resolveSubscriptionCurrentPlan } from './subscription-current-plan-authority';

const evidence = (raw: string | null | undefined, normalized: 'starter' | 'professional' | 'business' | 'enterprise' | undefined) => ({ raw, normalized });

describe('subscription mutation current-plan authority', () => {
  it('accepts canonical provider base Prices with consistent source labels including legacy aliases', () => {
    expect(resolveSubscriptionCurrentPlan('starter', [evidence('essential', 'starter'), evidence('starter', 'starter')])).toBe('starter');
    expect(resolveSubscriptionCurrentPlan('professional', [evidence('growth', 'professional'), evidence('pro', 'professional')])).toBe('professional');
    expect(resolveSubscriptionCurrentPlan('business', [evidence('business', 'business')])).toBe('business');
  });

  it('uses the provider price when optional metadata has not yet been populated', () => {
    expect(resolveSubscriptionCurrentPlan('professional', [evidence(null, undefined), evidence(undefined, undefined)])).toBe('professional');
  });

  it('never silently grants an Essential current-plan fallback on unknown provider price', () => {
    expect(resolveSubscriptionCurrentPlan(undefined, [evidence('starter', 'starter')])).toBeUndefined();
    expect(resolveSubscriptionCurrentPlan(null, [evidence('starter', 'starter')])).toBeUndefined();
  });

  it('fails closed when persisted or provider metadata is stale or contradictory', () => {
    expect(resolveSubscriptionCurrentPlan('professional', [evidence('starter', 'starter'), evidence('professional', 'professional')])).toBeUndefined();
    expect(resolveSubscriptionCurrentPlan('professional', [evidence('professional', 'professional'), evidence('starter', 'starter')])).toBeUndefined();
    expect(resolveSubscriptionCurrentPlan('starter', [evidence('enterprise', 'enterprise')])).toBeUndefined();
  });

  it('fails closed on a present but invalid or empty persisted label', () => {
    expect(resolveSubscriptionCurrentPlan('starter', [evidence('?', undefined)])).toBeUndefined();
    expect(resolveSubscriptionCurrentPlan('starter', [evidence('', undefined)])).toBeUndefined();
  });

  it('enforces provider Price and metadata consistency before idempotency claims and Stripe mutation', async () => {
    const source = await readFile(new URL('./subscription-lifecycle.ts', import.meta.url), 'utf8');
    const baseItem = source.indexOf('const baseItem = getBaseSubscriptionItem(subscription)');
    const providerPlan = source.indexOf('const currentPlan = resolveSubscriptionCurrentPlan(');
    const providerPriceLookup = source.indexOf('getBillingPlanIdForStripePriceId(baseItem.price.id)', providerPlan);
    const mismatchDenial = source.indexOf("throw new BillingLifecycleRequestError('billing_provider_outcome_uncertain', 409);", providerPlan);
    const claim = source.indexOf('const claim = await claimBillingLifecycleRequest({');
    const providerMutation = source.indexOf('updated = await stripe.subscriptions.update(');
    expect(baseItem).toBeGreaterThan(-1);
    expect(providerPlan).toBeGreaterThan(baseItem);
    expect(providerPriceLookup).toBeGreaterThan(providerPlan);
    expect(mismatchDenial).toBeGreaterThan(providerPriceLookup);
    expect(claim).toBeGreaterThan(mismatchDenial);
    expect(providerMutation).toBeGreaterThan(claim);
    expect(source).not.toContain("normalizeBillingPlanId(authority.plan ?? subscription.metadata.plan) ?? 'starter'");
  });
});
