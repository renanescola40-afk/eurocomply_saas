#!/usr/bin/env node

import { appendFileSync, readFileSync } from 'node:fs';

const MAX_RESPONSE_BYTES = 256 * 1024;
const PRICE_ID = /^price_[A-Za-z0-9]+$/;
const VERCEL_PROJECT_ID = /^prj_[A-Za-z0-9]+$/;
const VERCEL_TEAM_ID = /^team_[A-Za-z0-9]+$/;
const VERCEL_PROJECT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
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
  if (catalog?.transitionPolicy?.legacyStripePriceFallbackAllowed !== false) {
    throw new Error('legacy_stripe_price_fallback_must_be_disabled');
  }

  const keys = [];
  for (const publicId of ['essential', 'professional']) {
    const plan = catalog.plans?.[publicId];
    if (plan?.selfServe !== true || plan?.salesLed !== false) {
      throw new Error(`invalid_self_serve_policy:${publicId}`);
    }
    if (!plan?.monthlyPriceEnvKey || !plan?.annualPriceEnvKey) {
      throw new Error(`missing_price_env_contract:${publicId}`);
    }
    keys.push(plan.monthlyPriceEnvKey, plan.annualPriceEnvKey);
  }
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

export function runtimeVercelTargetFromEnv(source = process.env) {
  const target = {
    projectId: String(source.VERCEL_PROJECT_ID ?? '').trim(),
    teamId: String(source.VERCEL_TEAM_ID ?? '').trim(),
    projectName: String(source.VERCEL_PROJECT_NAME ?? '').trim(),
  };
  if (!VERCEL_PROJECT_ID.test(target.projectId)) throw new Error('invalid_runtime_vercel_project_id');
  if (!VERCEL_TEAM_ID.test(target.teamId)) throw new Error('invalid_runtime_vercel_team_id');
  if (!VERCEL_PROJECT_NAME.test(target.projectName)) throw new Error('invalid_runtime_vercel_project_name');
  return target;
}

export function assertRuntimeVercelTargetAuthority(authority, runtimeTarget) {
  if (!authority?.projectId || !authority?.teamId || !authority?.projectName) throw new Error('invalid_vercel_target_authority');
  for (const key of ['projectId', 'teamId', 'projectName']) {
    if (runtimeTarget?.[key] !== authority[key]) throw new Error(`vercel_target_authority_mismatch:${key}`);
  }
  return true;
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
  appendFileSync(githubEnv, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const catalog = loadJson(CATALOG_PATH, 'risck-comply.billing-commercial-catalog.v1');
  const providerTargets = loadJson(PROVIDER_TARGETS_PATH, 'risck-comply.production-provider-targets.v1');
  const target = runtimeVercelTargetFromEnv();
  assertRuntimeVercelTargetAuthority(providerTargets.vercel, target);
  const bindings = await loadVercelStripePriceBindings({
    token: requiredEnv('VERCEL_TOKEN'),
    target,
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
