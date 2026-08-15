#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';

import {
  buildStripeBillingPortalCreateBody,
  findManagedStripeBillingPortalConfigurations,
  loadStripeBillingPortalPolicy,
  stripeBillingPortalConfigurationMatchesPolicy,
} from '../security/stripe-billing-portal-policy.mjs';

const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
const CONFIGURATION_ID_PATTERN = /^bpc_[A-Za-z0-9]+$/;
const REQUIRED_CONFIRMATION = 'PROVISION_STRIPE_BILLING_PORTAL_CONFIGURATION';

function requiredEnv(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`Missing required environment: ${name}`);
  return value;
}

async function readBoundedJsonResponse(response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new Error('provider_response_too_large');
  }
  if (!response.body) throw new Error('provider_response_body_missing');

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_PROVIDER_RESPONSE_BYTES) {
        await reader.cancel('provider_response_too_large');
        throw new Error('provider_response_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

async function stripeRequest(path, { method = 'GET', body, idempotencyKey } = {}) {
  const headers = {
    Authorization: `Bearer ${stripeSecretKey}`,
  };
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers,
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Stripe API request failed with status ${response.status}`);
  return readBoundedJsonResponse(response);
}

function emitResult(configuration, disposition) {
  const configurationId = String(configuration?.id ?? '');
  if (!CONFIGURATION_ID_PATTERN.test(configurationId)) {
    throw new Error('Stripe returned an invalid Billing Portal configuration identifier');
  }

  const githubOutput = String(process.env.GITHUB_OUTPUT ?? '').trim();
  if (githubOutput) {
    appendFileSync(githubOutput, `configuration_id=${configurationId}\ndisposition=${disposition}\n`, 'utf8');
  }

  process.stdout.write(`Stripe Billing Portal configuration ${disposition}: ${configurationId}\n`);
}

const stripeSecretKey = requiredEnv('STRIPE_SECRET_KEY');
const confirmation = requiredEnv('STRIPE_BILLING_PORTAL_BOOTSTRAP_CONFIRMATION');
if (confirmation !== REQUIRED_CONFIRMATION) throw new Error('Stripe Billing Portal bootstrap confirmation mismatch');
if (!/^(?:sk|rk)_live_/.test(stripeSecretKey)) {
  throw new Error('Stripe Billing Portal bootstrap requires a live-mode secret or restricted key');
}

const policy = loadStripeBillingPortalPolicy();
const list = await stripeRequest('/billing_portal/configurations?active=true&limit=100');
const managed = findManagedStripeBillingPortalConfigurations(list?.data, policy);

if (managed.length > 1) {
  throw new Error('Multiple active RISCK COMPLY managed Billing Portal configurations exist');
}

if (managed.length === 1) {
  const configuration = managed[0];
  if (
    configuration?.livemode !== true
    || !stripeBillingPortalConfigurationMatchesPolicy(configuration, policy, { requireManagementMetadata: true })
  ) {
    throw new Error('Existing managed Stripe Billing Portal configuration drifted from the reviewed policy');
  }
  emitResult(configuration, 'reused');
  process.exit(0);
}

const policyDigest = createHash('sha256').update(JSON.stringify(policy)).digest('hex');
const created = await stripeRequest('/billing_portal/configurations', {
  method: 'POST',
  body: buildStripeBillingPortalCreateBody(policy).toString(),
  idempotencyKey: `risck-portal-bootstrap-${policyDigest.slice(0, 40)}`,
});

if (
  created?.active !== true
  || created?.livemode !== true
  || !CONFIGURATION_ID_PATTERN.test(String(created?.id ?? ''))
  || !stripeBillingPortalConfigurationMatchesPolicy(created, policy, { requireManagementMetadata: true })
) {
  throw new Error('Created Stripe Billing Portal configuration failed policy validation');
}

const verified = await stripeRequest(`/billing_portal/configurations/${encodeURIComponent(created.id)}`);
if (
  verified?.active !== true
  || verified?.livemode !== true
  || verified?.id !== created.id
  || !stripeBillingPortalConfigurationMatchesPolicy(verified, policy, { requireManagementMetadata: true })
) {
  throw new Error('Stripe Billing Portal configuration could not be verified after creation');
}

emitResult(verified, 'created');
