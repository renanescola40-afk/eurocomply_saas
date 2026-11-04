import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizePaidCheckoutPlanId, normalizePublicCheckoutPlanId } from '../../src/lib/billing/paid-checkout-plan.ts';

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

test('checkout intent never advertises payable checkout while paid GA or legal publication is blocked', async () => {
  const route = await readFile(new URL('../../src/app/api/billing/checkout-intent/route.ts', import.meta.url), 'utf8');
  const legal = route.indexOf('isPublicSelfServeContractEffective()');
  const flag = route.indexOf("process.env.RISCK_COMPLY_PAID_BILLING_REQUIRED === 'true'");
  const ready = route.indexOf('checkoutReady: !plan.salesLed && publicPaidCheckoutReady');
  const denial = route.indexOf("'public_paid_checkout_unavailable'");
  assert.ok(legal >= 0);
  assert.ok(flag >= 0);
  assert.ok(ready > legal && ready > flag);
  assert.ok(denial > ready);
  assert.ok(route.includes('const priceId = plan.salesLed ? undefined : getStripePriceId(plan);'));
});

test('signup, login, onboarding and middleware never upgrade free/basic URL intents to paid plans', async () => {
  const [signup, login, onboarding, middleware] = await Promise.all([
    readFile(new URL('../../src/app/[locale]/signup/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/app/[locale]/login/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/app/[locale]/onboarding/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/middleware.ts', import.meta.url), 'utf8'),
  ]);
  assert.ok(signup.includes('getBillingPlan(normalizePublicCheckoutPlanId(planId))?.id'));
  for (const client of [signup, login]) {
    assert.ok(client.includes("from '@/lib/billing/paid-checkout-plan'"));
    assert.ok(!client.includes("from '@/server/billing/paid-checkout-plan'"));
  }
  assert.equal(login.split('getBillingPlan(normalizePublicCheckoutPlanId(planId))?.id').length - 1, 2);
  assert.ok(onboarding.includes('normalizePublicCheckoutPlanId(resolvedSearchParams.plan)'));
  assert.ok(onboarding.includes('if (hasExplicitPlan && !normalizedPublicPlan)'));
  assert.ok(onboarding.includes('getBillingPlan(normalizePublicCheckoutPlanId(submittedPlan))'));
  assert.ok(onboarding.indexOf("error: 'invalid_plan'") < onboarding.indexOf('await createOrganization({'));
  const allowlist = middleware.match(/const CHECKOUT_PLAN_IDS = new Set\(\[([^\]]+)\]\);/)?.[1] ?? '';
  assert.ok(allowlist.includes("'essential'"));
  assert.ok(allowlist.includes("'business'"));
  assert.ok(!allowlist.includes("'basic'"));
  assert.ok(!allowlist.includes("'free'"));
  assert.ok(middleware.includes('CHECKOUT_PLAN_IDS.has(plan)'));
});

