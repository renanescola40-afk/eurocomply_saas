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

test('bootstrap verifies Vercel and Stripe readiness, revalidates remote main, then mutates', () => {
  const vercelPreflight = workflow.indexOf('run: node scripts/security/check-vercel-stripe-binding-types.mjs');
  const stripePreflight = workflow.indexOf('run: node scripts/security/check-stripe-live-account-bootstrap-preflight.mjs');
  const remoteMain = workflow.indexOf('Revalidate exact current remote main immediately before provider mutation');
  const provision = workflow.indexOf('run: node scripts/ops/provision-stripe-live-account.mjs', remoteMain);
  const reload = workflow.indexOf('run: node scripts/security/load-vercel-stripe-price-bindings.mjs', provision);
  assert.ok(vercelPreflight >= 0);
  assert.ok(stripePreflight > vercelPreflight);
  assert.ok(remoteMain > stripePreflight);
  assert.ok(provision > remoteMain);
  assert.ok(reload > provision);
  assert.match(workflow.slice(remoteMain, provision), /commits\/main/);
  assert.match(workflow.slice(remoteMain, provision), /test "\$main_sha" = "\$\{RELEASE_SHA,,\}"/);
});

test('Vercel target authority is loaded from reviewed config before provider network calls', () => {
  assert.match(workflow, /Load reviewed Vercel target authority into runtime environment/);
  assert.match(workflow, /VERCEL_PROJECT_ID=/);
  assert.match(workflow, /VERCEL_TEAM_ID=/);
  assert.match(workflow, /VERCEL_PROJECT_NAME=/);
  assert.match(providerProof, /Load reviewed Vercel target authority into runtime environment/);
});

test('production provider proof no longer consumes parallel GitHub Stripe Price variables', () => {
  assert.doesNotMatch(providerProof, /\$\{\{ vars\.STRIPE_PRICE_(ESSENTIAL|PROFESSIONAL|BUSINESS)/);
  assert.match(providerProof, /Load canonical Stripe Price bindings from Vercel Production/);
  assert.match(providerProof, /node scripts\/security\/load-vercel-stripe-price-bindings\.mjs/);
});
