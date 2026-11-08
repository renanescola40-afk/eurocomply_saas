import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveUniqueStripePricePlan } from '../../src/lib/billing/price-plan-authority.ts';
const p = (planId, ...priceIds) => ({ planId, priceIds });
test('resolves a single matching canonical plan', () => {
  assert.equal(resolveUniqueStripePricePlan('price_a', [p('starter','price_a'),p('professional','price_b')]), 'starter');
  assert.equal(resolveUniqueStripePricePlan('price_b', [p('starter','price_a'),p('professional','price_b')]), 'professional');
});
test('fails closed when same price is configured across two distinct plans', () => {
  assert.equal(resolveUniqueStripePricePlan('price_shared', [p('starter','price_shared'),p('professional','price_shared')]), undefined);
});
test('same plan can list its own canonical and legacy duplicate aliases without false ambiguity', () => {
  assert.equal(resolveUniqueStripePricePlan('price_a', [p('starter','price_a','price_a'),p('professional','price_b')]), 'starter');
});
test('ignores nonmatching, empty, null or unknown price ids', () => {
  assert.equal(resolveUniqueStripePricePlan('unrecognized', [p('starter','price_a')]), undefined);
  assert.equal(resolveUniqueStripePricePlan(null, [p('starter','price_a')]), undefined);
  assert.equal(resolveUniqueStripePricePlan('  ', [p('starter','price_a')]), undefined);
});
test('trims the input ID but never makes case-folded IDs equal', () => {
  assert.equal(resolveUniqueStripePricePlan(' price_a ', [p('starter','price_a')]), 'starter');
  assert.equal(resolveUniqueStripePricePlan('PRICE_A', [p('starter','price_a')]), undefined);
});
