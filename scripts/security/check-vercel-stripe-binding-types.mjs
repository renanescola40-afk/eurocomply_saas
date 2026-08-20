#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const MAX_RESPONSE_BYTES = 256 * 1024;
const CATALOG_PATH = 'config/billing-commercial-catalog.json';
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

export function canonicalPriceKeys(catalog) {
  const keys = [];
  for (const id of ['essential', 'professional', 'business']) {
    const plan = catalog?.plans?.[id];
    if (!plan?.monthlyPriceEnvKey || !plan?.annualPriceEnvKey) throw new Error(`invalid_price_env_contract:${id}`);
    keys.push(plan.monthlyPriceEnvKey, plan.annualPriceEnvKey);
  }
  return keys;
}

export function validateExistingPriceBindingTypes(rows, keys) {
  for (const key of keys) {
    const matches = (Array.isArray(rows) ? rows : []).filter((row) => (
      row?.key === key && (!Array.isArray(row?.target) || row.target.includes('production'))
    ));
    if (matches.length > 1) throw new Error(`vercel_env_ambiguous:${key}`);
    if (matches.length === 1 && String(matches[0]?.type ?? '').toLowerCase() === 'sensitive') {
      throw new Error(`vercel_price_binding_sensitive_type_requires_manual_recreate:${key}`);
    }
  }
  return true;
}

async function main() {
  const catalog = loadJson(CATALOG_PATH, 'risck-comply.billing-commercial-catalog.v1');
  const targets = loadJson(PROVIDER_TARGETS_PATH, 'risck-comply.production-provider-targets.v1');
  const token = requiredEnv('VERCEL_TOKEN');
  const target = targets.vercel;
  if (!target?.projectId || !target?.teamId) throw new Error('invalid_vercel_target');
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(target.projectId)}/env?target=production&decrypt=false&teamId=${encodeURIComponent(target.teamId)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`vercel_env_read_failed:${response.status}`);
  const body = await boundedJson(response);
  const keys = canonicalPriceKeys(catalog);
  validateExistingPriceBindingTypes(body?.envs, keys);
  process.stdout.write(`${JSON.stringify({ checkedProductionPriceKeys: keys.length, compatible: true, valuesPrinted: false })}\n`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
