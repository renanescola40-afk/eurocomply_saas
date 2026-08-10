import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const checkoutPage = readFileSync('src/app/[locale]/checkout/page.tsx', 'utf8');
const clientCatalog = readFileSync('src/lib/billing/plans.ts', 'utf8');

test('checkout derives sales-led behavior from the catalog instead of a hardcoded plan set', () => {
  assert.match(checkoutPage, /const selectedPlanIsSalesLed = selectedPlan\.salesLed/);
  assert.match(checkoutPage, /const isPlanSalesLed = plan\.salesLed/);
  assert.doesNotMatch(checkoutPage, /SALES_LED_PLAN_IDS/);
});

test('sales-led plans route to sales and keep catalog price references visible', () => {
  assert.match(checkoutPage, /contact\?intent=sales&plan=/);
  assert.match(checkoutPage, /planPriceLabel\(plan\)/);
  assert.match(checkoutPage, /startingPriceMonthly/);
  assert.match(checkoutPage, /Talk to sales/);
});

test('catalog marks Business and Enterprise sales-led while preserving self-serve lower tiers', () => {
  assert.match(clientCatalog, /id: 'business'[\s\S]*?salesLed: true/);
  assert.match(clientCatalog, /id: 'enterprise'[\s\S]*?salesLed: true/);
  assert.match(clientCatalog, /id: 'starter'[\s\S]*?salesLed: false/);
  assert.match(clientCatalog, /id: 'professional'[\s\S]*?salesLed: false/);
});
