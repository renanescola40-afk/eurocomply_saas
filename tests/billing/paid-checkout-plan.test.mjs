import assert from 'node:assert/strict';
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
