import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizePaidCheckoutPlanId, normalizePublicCheckoutPlanId } from '../../src/server/billing/paid-checkout-plan.ts';

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

test('public Checkout selection accepts only paid plans plus explicit sales-led plans', () => {
  for (const [raw, expected] of [
    ['starter', 'starter'], ['essential', 'starter'], ['Professional', 'professional'],
    [' growth ', 'professional'], ['pro', 'professional'], ['business', 'business'],
    ['ENTERPRISE', 'enterprise'],
  ]) {
    assert.equal(normalizePublicCheckoutPlanId(raw), expected);
  }
});

test('public Checkout selection never turns free/basic/unknown into paid Essential', () => {
  for (const raw of ['free', ' basic ', 'BASIC', 'Free', 'trial', '', null, undefined, 0, {}, []]) {
    assert.equal(normalizePublicCheckoutPlanId(raw), undefined);
  }
});

test('public checkout, legacy URL and authenticated intent reject bad input before presenting paid action', async () => {
  const [page, legacy, intent] = await Promise.all([
    readFile(new URL('../../src/app/[locale]/checkout/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/app/[locale]/billing/checkout/[plan]/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/app/api/billing/checkout-intent/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.ok(page.includes('hasExplicitPlan ? normalizePublicCheckoutPlanId(selectedPlanId) : undefined'));
  assert.ok(page.includes("Object.prototype.hasOwnProperty.call(resolvedSearchParams, 'plan')"));
  const pageReject = page.indexOf('if (hasExplicitPlan && !normalizedRequestedPlan)');
  assert.ok(pageReject >= 0);
  assert.ok(page.indexOf('redirect(`/${locale}/pricing?checkout=invalid_plan`)') > pageReject);
  assert.ok(page.indexOf('getBillingPlan(normalizedRequestedPlan)') > pageReject);
  assert.ok(page.indexOf('await getCurrentUser()') > pageReject);
  assert.ok(legacy.includes('const normalizedPlan = normalizePublicCheckoutPlanId(plan);'));
  assert.ok(legacy.includes('checkout=invalid_plan'));
  assert.ok(intent.includes('const plan = getBillingPlan(normalizePublicCheckoutPlanId(planId));'));
  assert.ok(intent.indexOf('if (!plan)') < intent.indexOf('getCurrentOrganizationForUser(user.id)'));
});
