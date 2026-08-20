#!/usr/bin/env node

import { appendFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const MAX_RESPONSE_BYTES = 256 * 1024;
const REQUIRED_CONFIRMATION = 'PROVISION_NEW_STRIPE_LIVE_ACCOUNT';
const ACCOUNT_ID = /^acct_[A-Za-z0-9]+$/;
const PRODUCT_ID = /^prod_[A-Za-z0-9]+$/;
const PRICE_ID = /^price_[A-Za-z0-9]+$/;
const WEBHOOK_ID = /^we_[A-Za-z0-9]+$/;
const MANAGED_BY = 'stripe-live-account-bootstrap-v1';
const CATALOG_PATH = 'config/billing-commercial-catalog.json';
const WEBHOOK_CONTRACT_PATH = 'config/stripe-webhook-contract.json';
const PROVIDER_TARGETS_PATH = 'config/production-provider-targets.json';

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function requiredEnv(name) {
  const value = env(name);
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

function buildForm(entries) {
  const body = new URLSearchParams();
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      for (const item of value) body.append(`${key}[]`, String(item));
    } else if (value !== undefined && value !== null) {
      body.set(key, String(value));
    }
  }
  return body;
}

function stableIdempotencyKey(prefix, material) {
  const digest = createHash('sha256').update(material).digest('hex').slice(0, 32);
  return `${prefix}-${digest}`.slice(0, 255);
}

export function buildCanonicalStripePlan(catalog) {
  if (catalog?.schema !== 'risck-comply.billing-commercial-catalog.v1' || catalog.currency !== 'EUR') {
    throw new Error('invalid_billing_catalog');
  }
  const lookupKeys = {
    essential: {
      monthly: 'risk_comply_essential_monthly',
      annual: 'risk_comply_essential_annual',
    },
    professional: {
      monthly: 'risk_comply_professional_monthly',
      annual: 'risk_comply_professional_annual',
    },
    business: {
      monthly: 'risk_comply_plan_399_monthly',
      annual: 'risk_comply_plan_399_annual',
    },
  };
  const plans = [];
  for (const publicId of ['essential', 'professional', 'business']) {
    const plan = catalog.plans?.[publicId];
    if (!plan || !Number.isInteger(plan.monthlyPriceCents) || !Number.isInteger(plan.annualPriceCents)) {
      throw new Error(`invalid_commercial_plan:${publicId}`);
    }
    if (publicId === 'business' && !(plan.selfServe === false && plan.salesLed === true)) {
      throw new Error('business_must_remain_sales_led');
    }
    if (publicId !== 'business' && !(plan.selfServe === true && plan.salesLed === false)) {
      throw new Error(`invalid_self_serve_policy:${publicId}`);
    }
    plans.push({
      publicId,
      name: plan.name,
      selfServe: plan.selfServe,
      salesLed: plan.salesLed,
      prices: [
        { cadence: 'monthly', interval: 'month', amount: plan.monthlyPriceCents, lookupKey: lookupKeys[publicId].monthly, envKey: plan.monthlyPriceEnvKey },
        { cadence: 'annual', interval: 'year', amount: plan.annualPriceCents, lookupKey: lookupKeys[publicId].annual, envKey: plan.annualPriceEnvKey },
      ],
    });
  }
  return plans;
}

function productMatches(product, publicId) {
  return product?.livemode === true
    && product?.active === true
    && product?.metadata?.billing_plan_id === publicId
    && product?.metadata?.catalog_status === 'canonical_live'
    && product?.metadata?.risck_comply_managed_by === MANAGED_BY;
}

function priceMatches(price, definition, productId) {
  return price?.livemode === true
    && price?.active === true
    && price?.type === 'recurring'
    && price?.recurring?.interval === definition.interval
    && price?.recurring?.interval_count === 1
    && String(price?.currency ?? '').toLowerCase() === 'eur'
    && price?.unit_amount === definition.amount
    && price?.lookup_key === definition.lookupKey
    && price?.product === productId;
}

export function inspectCanonicalWebhook(endpoints, canonicalUrl, requiredEvents) {
  const matching = Array.isArray(endpoints)
    ? endpoints.filter((endpoint) => endpoint?.url === canonicalUrl && endpoint?.livemode === true && endpoint?.status === 'enabled')
    : [];
  if (matching.length > 1) throw new Error('canonical_webhook_ambiguous');
  if (matching.length === 0) return { endpoint: null, exactEvents: false };
  const endpoint = matching[0];
  const actual = [...(endpoint.enabled_events ?? [])].map(String).sort();
  const expected = [...requiredEvents].map(String).sort();
  const exactEvents = actual.length === expected.length && actual.every((value, index) => value === expected[index]);
  return { endpoint, exactEvents };
}

export async function provisionStripeLiveAccount({
  stripeSecretKey,
  expectedAccountId,
  confirmation,
  catalog,
  webhookContract,
  webhookSecret,
  fetchImpl = fetch,
} = {}) {
  if (confirmation !== REQUIRED_CONFIRMATION) throw new Error('operator_confirmation_mismatch');
  if (!/^(?:sk|rk)_live_/.test(String(stripeSecretKey ?? ''))) throw new Error('live_stripe_key_required');
  if (!ACCOUNT_ID.test(String(expectedAccountId ?? ''))) throw new Error('invalid_expected_stripe_account_id');
  if (!/^whsec_[A-Za-z0-9]+$/.test(String(webhookSecret ?? ''))) throw new Error('canonical_webhook_secret_required');

  async function stripe(path, { method = 'GET', body, idempotencyKey } = {}) {
    const headers = { Authorization: `Bearer ${stripeSecretKey}` };
    if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const response = await fetchImpl(`https://api.stripe.com/v1${path}`, {
      method,
      headers,
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`stripe_api_${method.toLowerCase()}_${response.status}`);
    return boundedJson(response);
  }

  const account = await stripe('/account');
  if (account?.id !== expectedAccountId) throw new Error('stripe_account_id_mismatch');
  if (account?.charges_enabled !== true) throw new Error('stripe_account_charges_not_enabled');
  if (account?.details_submitted !== true) throw new Error('stripe_account_details_not_submitted');

  const planDefinitions = buildCanonicalStripePlan(catalog);
  const productsResponse = await stripe('/products?active=true&limit=100');
  if (productsResponse?.has_more === true) throw new Error('product_inventory_requires_pagination_review');
  const products = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
  const bindings = {};
  const created = { products: 0, prices: 0, webhook: 0 };
  const reused = { products: 0, prices: 0, webhook: 0 };

  for (const definition of planDefinitions) {
    const candidates = products.filter((product) => productMatches(product, definition.publicId));
    if (candidates.length > 1) throw new Error(`managed_product_ambiguous:${definition.publicId}`);
    let product = candidates[0] ?? null;
    if (!product) {
      const body = buildForm([
        ['name', definition.name],
        ['active', true],
        ['metadata[billing_plan_id]', definition.publicId],
        ['metadata[catalog_status]', 'canonical_live'],
        ['metadata[risck_comply_managed_by]', MANAGED_BY],
      ]);
      product = await stripe('/products', {
        method: 'POST',
        body,
        idempotencyKey: stableIdempotencyKey('risck-product', `${expectedAccountId}:${definition.publicId}`),
      });
      created.products += 1;
    } else {
      reused.products += 1;
    }
    if (!PRODUCT_ID.test(String(product?.id ?? '')) || !productMatches(product, definition.publicId)) {
      throw new Error(`canonical_product_verification_failed:${definition.publicId}`);
    }

    bindings[definition.publicId] = {};
    for (const priceDefinition of definition.prices) {
      const query = new URLSearchParams({ active: 'true', limit: '10' });
      query.append('lookup_keys[]', priceDefinition.lookupKey);
      const priceList = await stripe(`/prices?${query.toString()}`);
      const priceCandidates = Array.isArray(priceList?.data) ? priceList.data : [];
      if (priceCandidates.length > 1) throw new Error(`lookup_key_ambiguous:${priceDefinition.lookupKey}`);
      let price = priceCandidates[0] ?? null;
      if (price && !priceMatches(price, priceDefinition, product.id)) {
        throw new Error(`lookup_key_contract_mismatch:${priceDefinition.lookupKey}`);
      }
      if (!price) {
        const body = buildForm([
          ['currency', 'eur'],
          ['unit_amount', priceDefinition.amount],
          ['recurring[interval]', priceDefinition.interval],
          ['recurring[interval_count]', 1],
          ['product', product.id],
          ['lookup_key', priceDefinition.lookupKey],
          ['active', true],
          ['metadata[billing_plan_id]', definition.publicId],
          ['metadata[billing_cadence]', priceDefinition.cadence],
          ['metadata[catalog_status]', 'canonical_live'],
          ['metadata[risck_comply_managed_by]', MANAGED_BY],
        ]);
        price = await stripe('/prices', {
          method: 'POST',
          body,
          idempotencyKey: stableIdempotencyKey('risck-price', `${expectedAccountId}:${priceDefinition.lookupKey}:${priceDefinition.amount}`),
        });
        created.prices += 1;
      } else {
        reused.prices += 1;
      }
      if (!PRICE_ID.test(String(price?.id ?? '')) || !priceMatches(price, priceDefinition, product.id)) {
        throw new Error(`canonical_price_verification_failed:${priceDefinition.lookupKey}`);
      }
      bindings[definition.publicId][priceDefinition.cadence] = {
        priceId: price.id,
        envKey: priceDefinition.envKey,
        amount: priceDefinition.amount,
        interval: priceDefinition.interval,
        lookupKey: priceDefinition.lookupKey,
      };
    }
  }

  const canonicalWebhookUrl = `${String(webhookContract.productionBaseUrl ?? '').replace(/\/$/, '')}${webhookContract.canonicalPath ?? ''}`;
  const requiredEvents = Array.isArray(webhookContract.requiredEvents) ? webhookContract.requiredEvents : [];
  if (!canonicalWebhookUrl.startsWith('https://') || requiredEvents.length === 0) throw new Error('invalid_webhook_contract');
  const endpointList = await stripe('/webhook_endpoints?limit=100');
  if (endpointList?.has_more === true) throw new Error('webhook_inventory_requires_pagination_review');
  const inspected = inspectCanonicalWebhook(endpointList?.data, canonicalWebhookUrl, requiredEvents);
  let endpoint = inspected.endpoint;
  if (!endpoint) throw new Error('canonical_webhook_missing_manual_creation_required');
  if (!inspected.exactEvents) {
    const body = buildForm([['enabled_events', requiredEvents]]);
    endpoint = await stripe(`/webhook_endpoints/${encodeURIComponent(endpoint.id)}`, { method: 'POST', body });
  }
  if (!WEBHOOK_ID.test(String(endpoint?.id ?? '')) || endpoint?.url !== canonicalWebhookUrl || endpoint?.livemode !== true || endpoint?.status !== 'enabled') {
    throw new Error('canonical_webhook_verification_failed');
  }
  const finalEvents = [...(endpoint.enabled_events ?? [])].map(String).sort();
  const expectedEvents = [...requiredEvents].map(String).sort();
  if (finalEvents.length !== expectedEvents.length || !finalEvents.every((value, index) => value === expectedEvents[index])) {
    throw new Error('canonical_webhook_event_contract_mismatch');
  }
  reused.webhook += 1;

  return {
    accountId: account.id,
    chargesEnabled: true,
    bindings,
    webhook: {
      id: endpoint.id,
      url: canonicalWebhookUrl,
      secret: webhookSecret,
      newlyCreated: false,
    },
    created,
    reused,
  };
}

async function vercelJson(fetchImpl, url, { method = 'GET', token, body } = {}) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`vercel_api_${method.toLowerCase()}_${response.status}`);
  return boundedJson(response);
}

export async function syncVercelBillingBindings({
  fetchImpl = fetch,
  token,
  target,
  bindings,
  stripeSecretKey,
  webhookSecret,
} = {}) {
  if (!token) throw new Error('missing_vercel_token');
  if (!target?.projectId || !target?.teamId) throw new Error('invalid_vercel_target');
  const createBase = `https://api.vercel.com/v10/projects/${encodeURIComponent(target.projectId)}/env`;
  const updateBase = `https://api.vercel.com/v9/projects/${encodeURIComponent(target.projectId)}/env`;
  const teamQuery = `teamId=${encodeURIComponent(target.teamId)}`;
  const existing = await vercelJson(fetchImpl, `${createBase}?target=production&decrypt=false&${teamQuery}`, { token });
  const rows = Array.isArray(existing?.envs) ? existing.envs : [];
  const desired = new Map();
  desired.set('STRIPE_SECRET_KEY', { value: stripeSecretKey, type: 'sensitive' });
  if (webhookSecret) desired.set('STRIPE_WEBHOOK_SECRET', { value: webhookSecret, type: 'sensitive' });
  for (const plan of Object.values(bindings ?? {})) {
    for (const price of Object.values(plan ?? {})) {
      if (price?.envKey && price?.priceId) desired.set(price.envKey, { value: price.priceId, type: 'encrypted' });
    }
  }

  const changed = [];
  for (const [key, spec] of desired) {
    const candidates = rows.filter((row) => row?.key === key && (!Array.isArray(row?.target) || row.target.includes('production')));
    if (candidates.length > 1) throw new Error(`vercel_env_ambiguous:${key}`);
    if (candidates.length === 1) {
      await vercelJson(fetchImpl, `${updateBase}/${encodeURIComponent(candidates[0].id)}?${teamQuery}`, {
        method: 'PATCH',
        token,
        body: { value: spec.value, target: ['production'] },
      });
      changed.push({ key, disposition: 'updated' });
    } else {
      await vercelJson(fetchImpl, `${createBase}?${teamQuery}`, {
        method: 'POST',
        token,
        body: { key, value: spec.value, target: ['production'], type: spec.type },
      });
      changed.push({ key, disposition: 'created' });
    }
  }
  return changed;
}

function appendSafeOutputs(result, vercelChanges) {
  const output = env('GITHUB_OUTPUT');
  const summary = env('GITHUB_STEP_SUMMARY');
  const priceRows = [];
  for (const [planId, cadences] of Object.entries(result.bindings)) {
    for (const [cadence, binding] of Object.entries(cadences)) {
      priceRows.push({ planId, cadence, ...binding });
    }
  }
  if (output) {
    appendFileSync(output, `stripe_account_id=${result.accountId}\nwebhook_id=${result.webhook.id}\nwebhook_newly_created=${result.webhook.newlyCreated}\n`, 'utf8');
  }
  if (summary) {
    const lines = [
      '## Stripe live account bootstrap',
      '',
      `- Verified Stripe account: \`${result.accountId}\``,
      `- Products created/reused: ${result.created.products}/${result.reused.products}`,
      `- Prices created/reused: ${result.created.prices}/${result.reused.prices}`,
      `- Canonical webhook created/reused: ${result.created.webhook}/${result.reused.webhook}`,
      `- Vercel Production bindings written: ${vercelChanges.length}`,
      '',
      '### Safe Price IDs written to Vercel Production',
      '',
      '| Variable | Price ID |',
      '|---|---|',
      ...priceRows.map((row) => `| \`${row.envKey}\` | \`${row.priceId}\` |`),
      '',
      'Webhook signing secret is intentionally never printed or retained in artifacts. The canonical endpoint must already exist; the protected GitHub Environment secret is copied directly to Vercel Production in this run.',
      '',
      'The account-default Billing Portal is intentionally not created here because Stripe API-created portal configurations are non-default. Run the reviewed Portal bootstrap only after the Dashboard default exists.',
      '',
      'No customer, Checkout Session, subscription, invoice, payment or charge was created.',
    ];
    appendFileSync(summary, `${lines.join('\n')}\n`, 'utf8');
  }
}

async function main() {
  const catalog = loadJson(CATALOG_PATH, 'risck-comply.billing-commercial-catalog.v1');
  const webhookContract = loadJson(WEBHOOK_CONTRACT_PATH, 'risck-comply.stripe-webhook-contract.v1');
  const providerTargets = loadJson(PROVIDER_TARGETS_PATH, 'risck-comply.production-provider-targets.v1');
  const stripeSecretKey = requiredEnv('STRIPE_SECRET_KEY');
  const webhookSecret = requiredEnv('STRIPE_WEBHOOK_SECRET');
  const expectedAccountId = requiredEnv('EXPECTED_STRIPE_ACCOUNT_ID');
  const confirmation = requiredEnv('STRIPE_ACCOUNT_BOOTSTRAP_CONFIRMATION');
  const result = await provisionStripeLiveAccount({ stripeSecretKey, expectedAccountId, confirmation, catalog, webhookContract, webhookSecret });
  const vercelChanges = await syncVercelBillingBindings({
    token: requiredEnv('VERCEL_TOKEN'),
    target: providerTargets.vercel,
    bindings: result.bindings,
    stripeSecretKey,
    webhookSecret,
  });
  appendSafeOutputs(result, vercelChanges);
  process.stdout.write(`${JSON.stringify({
    accountId: result.accountId,
    chargesEnabled: result.chargesEnabled,
    created: result.created,
    reused: result.reused,
    webhook: { id: result.webhook.id, newlyCreated: result.webhook.newlyCreated },
    vercelBindingsWritten: vercelChanges.map(({ key, disposition }) => ({ key, disposition })),
    sensitiveValuesPrinted: false,
  }, null, 2)}\n`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
