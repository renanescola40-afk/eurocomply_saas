#!/usr/bin/env node

import { appendFileSync, readFileSync } from 'node:fs';

const MAX_RESPONSE_BYTES = 256 * 1024;
const PRICE_ID = /^price_[A-Za-z0-9]+$/;
const PROVIDER_TARGETS_PATH = 'config/production-provider-targets.json';
const CATALOG_PATH = 'config/billing-commercial-catalog.json';

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

export function requiredStripePriceKeys(catalog) {
  if (catalog?.schema !== 'risck-comply.billing-commercial-catalog.v1') throw new Error('invalid_billing_catalog');
  const keys = [];
  for (const publicId of ['essential', 'professional']) {
    const plan = catalog.plans?.[publicId];
    if (!plan?.monthlyPriceEnvKey || !plan?.annualPriceEnvKey) throw new Error(`missing_price_env_contract:${publicId}`);
    keys.push(plan.monthlyPriceEnvKey, plan.annualPriceEnvKey);
  }
  const business = catalog.plans?.business;
  if (!business?.monthlyPriceEnvKey) throw new Error('missing_price_env_contract:business');
  keys.push(business.monthlyPriceEnvKey);
  return keys;
}

export function extractVercelStripePriceBindings(rows, requiredKeys) {
  const bindings = {};
  for (const key of requiredKeys) {
    const candidates = (Array.isArray(rows) ? rows : []).filter((row) => (
      row?.key === key
      && (!Array.isArray(row?.target) || row.target.includes('production'))
    ));
    if (candidates.length !== 1) throw new Error(`vercel_price_binding_count:${key}:${candidates.length}`);
    const value = String(candidates[0]?.value ?? '').trim();
    if (!PRICE_ID.test(value)) throw new Error(`vercel_price_binding_invalid:${key}`);
    bindings[key] = value;
  }
  return bindings;
}

export async function loadVercelStripePriceBindings({ fetchImpl = fetch, token, target, catalog } = {}) {
  if (!token) throw new Error('missing_vercel_token');
  if (!target?.projectId || !target?.teamId || !target?.projectName) throw new Error('invalid_vercel_target');
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(target.projectId)}/env?target=production&decrypt=true&teamId=${encodeURIComponent(target.teamId)}`;
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`vercel_env_read_failed:${response.status}`);
  const body = await boundedJson(response);
  return extractVercelStripePriceBindings(body?.envs, requiredStripePriceKeys(catalog));
}

function appendBindingsToGitHubEnv(bindings) {
  const githubEnv = requiredEnv('GITHUB_ENV');
  const lines = Object.entries(bindings).map(([key, value]) => `${key}=${value}`);
  const compatibility = {
    STRIPE_PRICE_STARTER_MONTHLY: bindings.STRIPE_PRICE_ESSENTIAL_MONTHLY,
    STRIPE_PRICE_GROWTH_MONTHLY: bindings.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    STRIPE_PRICE_ENTERPRISE_MONTHLY: bindings.STRIPE_PRICE_BUSINESS_MONTHLY,
  };
  for (const [key, value] of Object.entries(compatibility)) {
    if (value) lines.push(`${key}=${value}`);
  }
  appendFileSync(githubEnv, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const catalog = loadJson(CATALOG_PATH, 'risck-comply.billing-commercial-catalog.v1');
  const providerTargets = loadJson(PROVIDER_TARGETS_PATH, 'risck-comply.production-provider-targets.v1');
  const bindings = await loadVercelStripePriceBindings({
    token: requiredEnv('VERCEL_TOKEN'),
    target: providerTargets.vercel,
    catalog,
  });
  appendBindingsToGitHubEnv(bindings);
  process.stdout.write(`${JSON.stringify({
    source: 'vercel-production-environment',
    bindingKeys: Object.keys(bindings).sort(),
    valuesPrinted: false,
  })}\n`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
