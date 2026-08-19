#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildStripeBillingPortalCreateBody,
  loadStripeBillingPortalPolicy,
  stripeBillingPortalConfigurationMatchesPolicy,
} from '../security/stripe-billing-portal-policy.mjs';

const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
const CONFIGURATION_ID_PATTERN = /^bpc_[A-Za-z0-9]+$/;
const REQUIRED_CONFIRMATION = 'PROVISION_STRIPE_BILLING_PORTAL_CONFIGURATION';
const PORTAL_CONTRACT_PATH = resolve('config/stripe-billing-portal-contract.json');

function requiredEnv(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`Missing required environment: ${name}`);
  return value;
}

function loadPortalContract() {
  const contract = JSON.parse(readFileSync(PORTAL_CONTRACT_PATH, 'utf8'));
  if (contract?.schema !== 'risck-comply.stripe-billing-portal-contract.v1') {
    throw new Error('invalid_stripe_billing_portal_contract_schema');
  }
  return contract;
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

function emitResult(configuration, disposition, contractSource) {
  const configurationId = String(configuration?.id ?? '');
  if (!CONFIGURATION_ID_PATTERN.test(configurationId)) {
    throw new Error('Stripe returned an invalid Billing Portal configuration identifier');
  }

  const githubOutput = String(process.env.GITHUB_OUTPUT ?? '').trim();
  if (githubOutput) {
    appendFileSync(
      githubOutput,
      `configuration_id=${configurationId}\ndisposition=${disposition}\ncontract_source=${contractSource}\n`,
      'utf8',
    );
  }

  process.stdout.write(`Stripe Billing Portal configuration ${disposition} for ${contractSource} contract authority: ${configurationId}\n`);
}

function validateSelectedConfiguration(configuration, policy, { requireDefault }) {
  return configuration?.active === true
    && configuration?.livemode === true
    && (!requireDefault || configuration?.is_default === true)
    && stripeBillingPortalConfigurationMatchesPolicy(configuration, policy, { requireManagementMetadata: true });
}

async function selectContractAuthority(contract) {
  if (contract.configurationId === null || contract.configurationId === undefined) {
    const list = await stripeRequest('/billing_portal/configurations?active=true&is_default=true&limit=2');
    const defaults = Array.isArray(list?.data)
      ? list.data.filter((configuration) => configuration?.active === true && configuration?.is_default === true)
      : [];
    if (defaults.length === 0) {
      throw new Error('account_default_portal_configuration_missing');
    }
    if (defaults.length !== 1) {
      throw new Error('account_default_portal_configuration_ambiguous');
    }
    return { configuration: defaults[0], contractSource: 'default', requireDefault: true };
  }

  const configurationId = String(contract.configurationId ?? '').trim();
  if (!CONFIGURATION_ID_PATTERN.test(configurationId)) {
    throw new Error('invalid_explicit_portal_configuration_id');
  }
  const configuration = await stripeRequest(`/billing_portal/configurations/${encodeURIComponent(configurationId)}`);
  if (configuration?.id !== configurationId) {
    throw new Error('explicit_portal_configuration_not_found');
  }
  return { configuration, contractSource: 'explicit', requireDefault: false };
}

const stripeSecretKey = requiredEnv('STRIPE_SECRET_KEY');
const confirmation = requiredEnv('STRIPE_BILLING_PORTAL_BOOTSTRAP_CONFIRMATION');
if (confirmation !== REQUIRED_CONFIRMATION) throw new Error('Stripe Billing Portal bootstrap confirmation mismatch');
if (!/^(?:sk|rk)_live_/.test(stripeSecretKey)) {
  throw new Error('Stripe Billing Portal bootstrap requires a live-mode secret or restricted key');
}

const policy = loadStripeBillingPortalPolicy();
const contract = loadPortalContract();
const selected = await selectContractAuthority(contract);

if (validateSelectedConfiguration(selected.configuration, policy, { requireDefault: selected.requireDefault })) {
  emitResult(selected.configuration, 'reused', selected.contractSource);
  process.exit(0);
}

if (selected.configuration?.active !== true || selected.configuration?.livemode !== true) {
  throw new Error('contract_selected_portal_configuration_not_active_live');
}
if (selected.requireDefault && selected.configuration?.is_default !== true) {
  throw new Error('contract_selected_portal_configuration_not_account_default');
}

const policyDigest = createHash('sha256').update(JSON.stringify(policy)).digest('hex');
const configurationId = String(selected.configuration.id);
const updated = await stripeRequest(`/billing_portal/configurations/${encodeURIComponent(configurationId)}`, {
  method: 'POST',
  body: buildStripeBillingPortalCreateBody(policy).toString(),
  idempotencyKey: `risck-portal-align-${configurationId}-${policyDigest.slice(0, 24)}`,
});

if (
  updated?.id !== configurationId
  || !validateSelectedConfiguration(updated, policy, { requireDefault: selected.requireDefault })
) {
  throw new Error('Stripe Billing Portal configuration failed reviewed policy alignment');
}

const verified = await stripeRequest(`/billing_portal/configurations/${encodeURIComponent(configurationId)}`);
if (
  verified?.id !== configurationId
  || !validateSelectedConfiguration(verified, policy, { requireDefault: selected.requireDefault })
) {
  throw new Error('Stripe Billing Portal configuration could not be verified after policy alignment');
}

emitResult(verified, 'aligned', selected.contractSource);
