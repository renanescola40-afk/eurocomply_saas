import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { validateLiveAccountBootstrapPreflight } from '../../scripts/security/check-stripe-live-account-bootstrap-preflight.mjs';

const authority = {
  schema: 'risck-comply.stripe-live-account-authority.v1',
  accountId: 'acct_live123',
  mode: 'live',
};
const webhookContract = {
  schema: 'risck-comply.stripe-webhook-contract.v1',
  productionBaseUrl: 'https://www.risckcomply.com',
  canonicalPath: '/api/stripe/webhook',
  requiredEvents: [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
    'invoice.paid',
  ],
};
const endpoint = {
  id: 'we_live123',
  url: 'https://www.risckcomply.com/api/stripe/webhook',
  livemode: true,
  status: 'enabled',
  enabled_events: webhookContract.requiredEvents,
};

test('accepts only the reviewed activated account with one exact canonical webhook', () => {
  assert.deepEqual(validateLiveAccountBootstrapPreflight({
    account: { id: authority.accountId, charges_enabled: true, details_submitted: true },
    authority,
    endpoints: [endpoint],
    webhookContract,
    webhookSecret: 'whsec_live123',
  }), {
    accountId: authority.accountId,
    chargesEnabled: true,
    detailsSubmitted: true,
    canonicalWebhookReady: true,
    requiredEventCount: 6,
  });
});

test('fails closed before mutation for wrong account, inactive charges, missing webhook, event drift, or missing signing secret', () => {
  const good = {
    account: { id: authority.accountId, charges_enabled: true, details_submitted: true },
    authority,
    endpoints: [endpoint],
    webhookContract,
    webhookSecret: 'whsec_live123',
  };
  assert.throws(() => validateLiveAccountBootstrapPreflight({ ...good, account: { ...good.account, id: 'acct_other' } }), /stripe_account_id_mismatch/);
  assert.throws(() => validateLiveAccountBootstrapPreflight({ ...good, account: { ...good.account, charges_enabled: false } }), /stripe_account_charges_not_enabled/);
  assert.throws(() => validateLiveAccountBootstrapPreflight({ ...good, endpoints: [] }), /canonical_webhook_missing_manual_creation_required/);
  assert.throws(() => validateLiveAccountBootstrapPreflight({ ...good, endpoints: [{ ...endpoint, enabled_events: ['invoice.paid'] }] }), /canonical_webhook_event_contract_mismatch/);
  assert.throws(() => validateLiveAccountBootstrapPreflight({ ...good, webhookSecret: '' }), /canonical_webhook_secret_required/);
});

test('preflight implementation is read-only against Stripe', () => {
  const source = readFileSync(new URL('../../scripts/security/check-stripe-live-account-bootstrap-preflight.mjs', import.meta.url), 'utf8');
  assert.match(source, /async function stripeGet/);
  assert.doesNotMatch(source, /method:\s*['"]POST['"]/);
  assert.doesNotMatch(source, /method:\s*['"]PATCH['"]/);
  assert.doesNotMatch(source, /method:\s*['"]DELETE['"]/);
});
