import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const checkoutPage = readFileSync('src/app/[locale]/checkout/page.tsx', 'utf8');
const signupPage = readFileSync('src/app/[locale]/signup/page.tsx', 'utf8');
const billingPage = readFileSync('src/app/[locale]/dashboard/organizations/billing/billing-page-view.tsx', 'utf8');
const clientCatalog = readFileSync('src/lib/billing/plans.ts', 'utf8');

test('checkout derives sales-led behavior from the catalog instead of a hardcoded plan set', () => {
  assert.match(checkoutPage, /const selectedPlanIsSalesLed = selectedPlan\.salesLed/);
  assert.match(checkoutPage, /const isPlanSalesLed = plan\.salesLed/);
  assert.doesNotMatch(checkoutPage, /SALES_LED_PLAN_IDS/);
});

test('signup sends sales-led plan selections to sales instead of self-serve auth', () => {
  assert.match(signupPage, /plan\.salesLed/);
  assert.match(signupPage, /selectedPlan\.salesLed/);
  assert.match(signupPage, /SalesLedPlanHandoff/);
  assert.match(signupPage, /contact\?intent=sales&plan=/);
  assert.doesNotMatch(signupPage, /€\{plan\.priceMonthly\}/);
});

test('billing dashboard derives sales-led actions and localized price labels from catalog metadata', () => {
  assert.match(billingPage, /const isSalesLed = plan\.salesLed/);
  assert.match(billingPage, /contact\?intent=sales&plan=/);
  assert.match(billingPage, /formatPlanPrice\(plan, copy\)/);
  assert.match(billingPage, /plan\.priceMonthly/);
  assert.match(billingPage, /plan\.startingPriceMonthly/);
  assert.doesNotMatch(billingPage, /plan\.id === 'enterprise'/);
});

test('sales-led plans keep fixed or starting catalog price references visible', () => {
  assert.match(checkoutPage, /planPriceLabel\(plan, locale, copy\)/);
  assert.match(checkoutPage, /plan\.priceMonthly/);
  assert.match(checkoutPage, /startingPriceMonthly/);
  assert.match(signupPage, /getPlanPriceLabel\(plan, activeLocale\)/);
  assert.match(signupPage, /startingPriceMonthly/);
  assert.match(billingPage, /startingPriceMonthly/);
});

test('catalog marks Business and Enterprise sales-led while preserving self-serve lower tiers', () => {
  assert.match(clientCatalog, /id: 'business'[\s\S]*?salesLed: true/);
  assert.match(clientCatalog, /id: 'enterprise'[\s\S]*?salesLed: true/);
  assert.match(clientCatalog, /id: 'starter'[\s\S]*?salesLed: false/);
  assert.match(clientCatalog, /id: 'professional'[\s\S]*?salesLed: false/);
});