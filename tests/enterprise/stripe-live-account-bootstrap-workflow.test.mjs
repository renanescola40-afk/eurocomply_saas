import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../../.github/workflows/stripe-live-account-bootstrap.yml', import.meta.url), 'utf8');
const providerProof = readFileSync(new URL('../../.github/workflows/production-provider-runtime-proof.yml', import.meta.url), 'utf8');

test('new-account bootstrap is manual, Production-gated, exact-SHA bound, and account-authority bound', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /environment: Production/);
  assert.match(workflow, /PROVISION_NEW_STRIPE_LIVE_ACCOUNT/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$\{RELEASE_SHA,,\}"/);
  assert.match(workflow, /config\/stripe-live-account-authority\.json/);
  assert.match(workflow, /EXPECTED_STRIPE_ACCOUNT_ID/);
});

test('protected bootstrap consumes secrets without echoing their values', () => {
  assert.match(workflow, /STRIPE_SECRET_KEY: \$\{\{ secrets\.STRIPE_SECRET_KEY \}\}/);
  assert.match(workflow, /STRIPE_WEBHOOK_SECRET: \$\{\{ secrets\.STRIPE_WEBHOOK_SECRET \}\}/);
  assert.match(workflow, /VERCEL_TOKEN: \$\{\{ secrets\.VERCEL_TOKEN \}\}/);
  assert.doesNotMatch(workflow, /echo[^\n]*(STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|VERCEL_TOKEN)/);
  assert.doesNotMatch(workflow, /upload-artifact/);
});

test('bootstrap verifies Vercel binding safety before provider mutation and re-reads bindings afterwards', () => {
  const preflight = workflow.indexOf('run: node scripts/security/check-vercel-stripe-binding-types.mjs');
  const provision = workflow.indexOf('run: node scripts/ops/provision-stripe-live-account.mjs');
  const reload = workflow.indexOf('run: node scripts/security/load-vercel-stripe-price-bindings.mjs');
  assert.ok(preflight >= 0 && provision > preflight && reload > provision);
});

test('production provider proof no longer consumes parallel GitHub Stripe Price variables', () => {
  assert.doesNotMatch(providerProof, /\$\{\{ vars\.STRIPE_PRICE_(ESSENTIAL|PROFESSIONAL|BUSINESS)/);
  assert.match(providerProof, /Load canonical Stripe Price bindings from Vercel Production/);
  assert.match(providerProof, /node scripts\/security\/load-vercel-stripe-price-bindings\.mjs/);
});
