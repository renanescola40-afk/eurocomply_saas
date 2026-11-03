import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizePaidCheckoutPlanId } from '../../src/server/billing/paid-checkout-plan.ts';

test('accepts canonical Essential/Professional plan IDs and their non-misleading legacy names', () => {
  assert.equal(normalizePaidCheckoutPlanId('essential'), 'starter');
  assert.equal(normalizePaidCheckoutPlanId('starter'), 'starter');
  assert.equal(normalizePaidCheckoutPlanId('professional'), 'professional');
  assert.equal(normalizePaidCheckoutPlanId('growth'), 'professional');
  assert.equal(normalizePaidCheckoutPlanId('pro'), 'professional');
});

test('never turns a free or basic checkout request into a paid Essential subscription', () => {
  for (const input of ['free', ' FREE ', 'Free', 'basic', ' BASIC ']) {
    assert.equal(normalizePaidCheckoutPlanId(input), undefined, `ambiguous input ${input} must be rejected`);
  }
});

test('rejects unknown, sales-led, empty and non-string input fail-closed', () => {
  for (const input of ['business', 'enterprise', '', 'trial', 'zero', 'premium', null, undefined, 0, {}, []]) {
    assert.equal(normalizePaidCheckoutPlanId(input), undefined);
  }
});


test('subscription lifecycle rejects ambiguous free/basic plan requests before provider mutation', async () => {
  const source = await readFile(new URL('../../src/app/api/billing/subscription/route.ts', import.meta.url), 'utf8');
  const normalization = source.indexOf('const plan = parsed.data.plan ? normalizeBillingPlanId(parsed.data.plan) : undefined;');
  const paidAuthority = source.indexOf('normalizePaidCheckoutPlanId(parsed.data.plan) !== plan');
  const denial = source.indexOf("return noStoreJson({ error: 'invalid_plan' }, { status: 400 });");
  const providerMutation = source.indexOf('const result = await mutateSubscriptionLifecycle({');
  assert.ok(normalization >= 0);
  assert.ok(paidAuthority > normalization);
  assert.ok(denial > paidAuthority);
  assert.ok(providerMutation > denial);
  assert.ok(source.includes('isSelfServePlan(plan) && normalizePaidCheckoutPlanId(parsed.data.plan) !== plan'));
});
