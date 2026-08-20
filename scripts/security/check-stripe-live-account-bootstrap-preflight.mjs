#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const MAX_RESPONSE_BYTES = 128 * 1024;
const AUTHORITY_PATH = 'config/stripe-live-account-authority.json';
const WEBHOOK_CONTRACT_PATH = 'config/stripe-webhook-contract.json';

function requiredEnv(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`missing_required_environment:${name}`);
  return value;
}

function loadJson(path, schema) {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value?.schema !== schema) throw new Error(`invalid_schema:${path}`);
  return value;
}

async function boundedJson(response) {
  if (!response?.body) throw new Error('provider_response_body_missing');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel('provider_response_too_large');
        throw new Error('provider_response_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export function validateLiveAccountBootstrapPreflight({ account, authority, endpoints, webhookContract, webhookSecret }) {
  if (!/^whsec_[A-Za-z0-9]+$/.test(String(webhookSecret ?? ''))) {
    throw new Error('canonical_webhook_secret_required');
  }
  if (!/^acct_[A-Za-z0-9]+$/.test(String(authority?.accountId ?? '')) || authority?.mode !== 'live') {
    throw new Error('invalid_stripe_live_account_authority');
  }
  if (account?.id !== authority.accountId) throw new Error('stripe_account_id_mismatch');
  if (account?.charges_enabled !== true) throw new Error('stripe_account_charges_not_enabled');
  if (account?.details_submitted !== true) throw new Error('stripe_account_details_not_submitted');

  const canonicalUrl = `${String(webhookContract?.productionBaseUrl ?? '').replace(/\/$/, '')}${String(webhookContract?.canonicalPath ?? '')}`;
  const requiredEvents = Array.isArray(webhookContract?.requiredEvents)
    ? webhookContract.requiredEvents.map(String).sort()
    : [];
  if (!canonicalUrl.startsWith('https://') || requiredEvents.length === 0) throw new Error('invalid_webhook_contract');

  const matches = (Array.isArray(endpoints) ? endpoints : []).filter((endpoint) => (
    endpoint?.url === canonicalUrl
    && endpoint?.livemode === true
    && endpoint?.status === 'enabled'
  ));
  if (matches.length === 0) throw new Error('canonical_webhook_missing_manual_creation_required');
  if (matches.length !== 1) throw new Error('canonical_webhook_ambiguous');

  const actualEvents = Array.isArray(matches[0]?.enabled_events)
    ? matches[0].enabled_events.map(String).sort()
    : [];
  if (actualEvents.length !== requiredEvents.length || !actualEvents.every((value, index) => value === requiredEvents[index])) {
    throw new Error('canonical_webhook_event_contract_mismatch');
  }

  return {
    accountId: account.id,
    chargesEnabled: true,
    detailsSubmitted: true,
    canonicalWebhookReady: true,
    requiredEventCount: requiredEvents.length,
  };
}

async function stripeGet(path, secretKey) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`stripe_api_get_${response.status}`);
  return boundedJson(response);
}

async function main() {
  const secretKey = requiredEnv('STRIPE_SECRET_KEY');
  if (!/^(?:sk|rk)_live_/.test(secretKey)) throw new Error('live_stripe_key_required');
  const webhookSecret = requiredEnv('STRIPE_WEBHOOK_SECRET');
  const authority = loadJson(AUTHORITY_PATH, 'risck-comply.stripe-live-account-authority.v1');
  const webhookContract = loadJson(WEBHOOK_CONTRACT_PATH, 'risck-comply.stripe-webhook-contract.v1');

  const [account, endpointList] = await Promise.all([
    stripeGet('/account', secretKey),
    stripeGet('/webhook_endpoints?limit=100', secretKey),
  ]);
  if (endpointList?.has_more === true) throw new Error('webhook_inventory_requires_pagination_review');

  const result = validateLiveAccountBootstrapPreflight({
    account,
    authority,
    endpoints: endpointList?.data,
    webhookContract,
    webhookSecret,
  });
  process.stdout.write(`${JSON.stringify({ ...result, providerResponseBodiesStored: false, secretValuesPrinted: false })}\n`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
