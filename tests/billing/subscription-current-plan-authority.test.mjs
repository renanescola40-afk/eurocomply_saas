import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSubscriptionCurrentPlan } from '../../src/server/billing/subscription-current-plan-authority.ts';

const prove = (raw, normalized) => ({ raw, normalized });

test('resolves a paid plan only from a recognized provider Stripe base Price and matching persisted/metadata plans', () => {
  assert.equal(resolveSubscriptionCurrentPlan('starter', [prove('essential', 'starter'), prove('starter', 'starter')]), 'starter');
  assert.equal(resolveSubscriptionCurrentPlan('professional', [prove('growth', 'professional'), prove('pro', 'professional')]), 'professional');
  assert.equal(resolveSubscriptionCurrentPlan('business', [prove('business', 'business'), prove('business', 'business')]), 'business');
});

test('allows absent optional persisted sources only when provider base Price identifies the plan', () => {
  assert.equal(resolveSubscriptionCurrentPlan('professional', [prove(null, undefined), prove(undefined, undefined)]), 'professional');
});

test('fails closed on missing or unknown base Price identity rather than assuming paid Essential', () => {
  assert.equal(resolveSubscriptionCurrentPlan(undefined, [prove('starter', 'starter')]), undefined);
  assert.equal(resolveSubscriptionCurrentPlan(null, [prove('starter', 'starter')]), undefined);
});

test('fails closed on a stale persisted subscription tier, even when provider Price is valid', () => {
  assert.equal(resolveSubscriptionCurrentPlan('professional', [prove('starter', 'starter'), prove('professional', 'professional')]), undefined);
});

test('fails closed on a stale Stripe subscription metadata plan, even when persisted tier matches', () => {
  assert.equal(resolveSubscriptionCurrentPlan('professional', [prove('professional', 'professional'), prove('essential', 'starter')]), undefined);
});

test('fails closed on present but unknown/empty legacy source identifiers', () => {
  assert.equal(resolveSubscriptionCurrentPlan('starter', [prove('surprise', undefined), prove(null, undefined)]), undefined);
  assert.equal(resolveSubscriptionCurrentPlan('starter', [prove('', undefined), prove(null, undefined)]), undefined);
});

test('never accepts sources that claim an Enterprise plan for a self-serve provider Price', () => {
  assert.equal(resolveSubscriptionCurrentPlan('starter', [prove('enterprise', 'enterprise')]), undefined);
});
