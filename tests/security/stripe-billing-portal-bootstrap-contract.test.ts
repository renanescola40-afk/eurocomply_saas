import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/stripe-billing-portal-bootstrap.yml', 'utf8');
const provisioner = readFileSync('scripts/ops/provision-stripe-billing-portal-config.mjs', 'utf8');
const policyModule = readFileSync('scripts/security/stripe-billing-portal-policy.mjs', 'utf8');

describe('Stripe Billing Portal bootstrap contract', () => {
  it('is a protected manual production action bound to exact current main', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('pull-requests: write');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('fetch-depth: 0');
    expect(workflow).toContain('CURRENT_MAIN="$(git rev-parse origin/main)"');
    expect(workflow).toContain('test "$CURRENT_MAIN" = "${RELEASE_SHA,,}"');
    expect(workflow).toContain('git checkout --detach "${RELEASE_SHA,,}"');
    expect(workflow).not.toContain('pull_request_target');
  });

  it('requires explicit operator confirmation and a live Stripe credential', () => {
    expect(workflow).toContain('PROVISION_STRIPE_BILLING_PORTAL_CONFIGURATION');
    expect(provisioner).toContain("REQUIRED_CONFIRMATION = 'PROVISION_STRIPE_BILLING_PORTAL_CONFIGURATION'");
    expect(provisioner).toContain("/^(?:sk|rk)_live_/");
    expect(provisioner).toContain("requiredEnv('STRIPE_SECRET_KEY')");
    expect(provisioner).not.toContain('sk_live_');
  });

  it('creates only the reviewed portal resource and never mutates customers or subscriptions', () => {
    expect(provisioner).toContain("'/billing_portal/configurations?active=true&limit=100'");
    expect(provisioner).toContain("'/billing_portal/configurations'");
    expect(provisioner).toContain("method: 'POST'");
    expect(provisioner).not.toContain('/customers');
    expect(provisioner).not.toContain('/subscriptions');
    expect(provisioner).not.toContain('/checkout/sessions');
    expect(provisioner).not.toContain('/payment_intents');
    expect(policyModule).toContain("body.set('features[subscription_cancel][enabled]'" );
    expect(policyModule).toContain("body.set('features[subscription_update][enabled]'" );
  });

  it('is idempotent and fails closed on managed-provider drift or duplicates', () => {
    expect(provisioner).toContain('findManagedStripeBillingPortalConfigurations');
    expect(provisioner).toContain('managed.length > 1');
    expect(provisioner).toContain('Multiple active RISCK COMPLY managed Billing Portal configurations exist');
    expect(provisioner).toContain('Existing managed Stripe Billing Portal configuration drifted from the reviewed policy');
    expect(provisioner).toContain("createHash('sha256')");
    expect(provisioner).toContain('Idempotency-Key');
    expect(provisioner).toContain('risck-portal-bootstrap-');
    expect(provisioner).toContain('could not be verified after creation');
  });

  it('does not auto-commit, auto-merge, retain provider payloads, or claim runtime completion', () => {
    expect(workflow).not.toContain('actions/upload-artifact');
    expect(workflow).not.toContain('git commit');
    expect(workflow).not.toContain('git push');
    expect(workflow).not.toContain('gh pr create');
    expect(workflow).not.toContain('auto-merge');
    expect(workflow).toContain('Pin the reviewed ID in `config/stripe-billing-portal-contract.json` through a normal pull request');
    expect(provisioner).not.toContain('writeFileSync');
    expect(provisioner).not.toContain('stripe-billing-portal-contract.json');
  });

  it('bounds provider responses and rejects redirects', () => {
    expect(provisioner).toContain('const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024');
    expect(provisioner).toContain("response.headers.get('content-length')");
    expect(provisioner).toContain('response.body.getReader()');
    expect(provisioner).toContain('totalBytes > MAX_PROVIDER_RESPONSE_BYTES');
    expect(provisioner).toContain("reader.cancel('provider_response_too_large')");
    expect(provisioner).toContain("new TextDecoder('utf-8', { fatal: true })");
    expect(provisioner).toContain("redirect: 'error'");
    expect(provisioner).toContain('AbortSignal.timeout(15000)');
    expect(provisioner).not.toContain('response.json()');
  });
});
