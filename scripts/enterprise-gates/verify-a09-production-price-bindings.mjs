#!/usr/bin/env node
/**
 * A-09 / BIL-01: read-only, fail-closed Vercel Production Price binding proof.
 *
 * Checks current provider values against six historical LIVE Stripe Price IDs.
 * It does NOT check Stripe's current price state, perform Checkout, mutate
 * production, or grant formal Enterprise gate acceptance.
 *
 * A scoped Vercel read token is required at execution time:
 *   node scripts/enterprise-gates/verify-a09-production-price-bindings.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const A09_KEYS = Object.freeze([
  'STRIPE_PRICE_ESSENTIAL_MONTHLY',
  'STRIPE_PRICE_ESSENTIAL_ANNUAL',
  'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'STRIPE_PRICE_PROFESSIONAL_ANNUAL',
  'STRIPE_PRICE_BUSINESS_MONTHLY',
  'STRIPE_PRICE_BUSINESS_ANNUAL',
]);
const PROJECT = 'prj_APpXAyQFy1Gie50xfbO45zjkyUSm';
const TEAM = 'team_wu3LZI6ReFxO16xipv73GLwG';
const ID = /^[A-Za-z0-9_-]{8,128}$/;
const PRICE = /^price_[A-Za-z0-9]+$/;
const MAX_JSON_BYTES = 1_000_000;
const MAX_ENV_PAGES = 8;
const MAX_ENV_ROWS = 2000;

export function expectedA09Prices(evidence) {
  if (evidence?.schema !== 'risck-comply.g1-billing-catalog-live-prices.v1'
    || evidence.stripeMode !== 'LIVE'
    || evidence.productionProjectId !== PROJECT
    || !Array.isArray(evidence.rows)
    || evidence.rows.length !== A09_KEYS.length) {
    throw new Error('a09_evidence_contract_invalid');
  }
  const expected = new Map();
  for (const row of evidence.rows) {
    if (!A09_KEYS.includes(row?.environmentVariable)
      || expected.has(row.environmentVariable)
      || !PRICE.test(row.stripePriceId ?? '')
      || row.livemode !== true
      || row.priceActive !== true
      || row.productActive !== true
      || !Array.isArray(row.environmentVariableTargets)
      || !row.environmentVariableTargets.includes('production')) {
      throw new Error('a09_evidence_row_invalid');
    }
    expected.set(row.environmentVariable, row.stripePriceId);
  }
  if (expected.size !== A09_KEYS.length || new Set(expected.values()).size !== A09_KEYS.length) {
    throw new Error('a09_evidence_incomplete');
  }
  return expected;
}

// Vercel's project-wide env listing includes custom QA entries with the same
// keys as Production. A missing/empty target MUST NOT become Production proof.
export function isExplicitProductionVariable(row) {
  return !!row && Array.isArray(row.target)
    && row.target.includes('production')
    && (!Array.isArray(row.customEnvironmentIds) || row.customEnvironmentIds.length === 0)
    && !row.gitBranch;
}

async function getJson(fetchImpl, url, token) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new Error('provider_request_unavailable');
  }
  if (!response?.ok) throw new Error('provider_http_read_failed');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_JSON_BYTES) throw new Error('provider_response_too_large');
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('provider_invalid_json');
  }
}
// Pagination cursor handling is deliberately fail-closed: on the Vercel env
// endpoint the "until" query param is not explicitly documented. If it does
// not advance the page, duplicate IDs or stagnant cursors block A-09.
export async function readCompleteVercelEnvironmentRows({ fetchImpl, token, projectId = PROJECT, teamId = TEAM }) {
  const seenIds = new Set();
  const rows = [];
  let previousCursor = null;
  for (let page = 0; page < MAX_ENV_PAGES; page += 1) {
    const url = new URL('https://api.vercel.com/v10/projects/' + projectId + '/env');
    url.searchParams.set('teamId', teamId);
    url.searchParams.set('decrypt', 'false');
    if (previousCursor !== null) url.searchParams.set('until', String(previousCursor));
    const listing = await getJson(fetchImpl, url.toString(), token);
    if (!Array.isArray(listing?.envs)) throw new Error('vercel_environment_listing_invalid');
    if (listing.truncated === true || listing.truncation?.arrays > 0) {
      throw new Error('vercel_environment_listing_incomplete');
    }
    for (const row of listing.envs) {
      const id = row?.id;
      if (typeof id !== 'string' || !ID.test(id) || seenIds.has(id)) {
        throw new Error('vercel_environment_listing_incomplete');
      }
      seenIds.add(id);
      rows.push(row);
      if (rows.length > MAX_ENV_ROWS) throw new Error('vercel_environment_listing_incomplete');
    }
    const next = listing.pagination?.next;
    if (next === null || next === undefined || next === 0) return rows;
    if (!Number.isSafeInteger(next) || next <= 0
      || (previousCursor !== null && next >= previousCursor)
      || listing.envs.length === 0) {
      throw new Error('vercel_environment_listing_incomplete');
    }
    previousCursor = next;
  }
  throw new Error('vercel_environment_listing_incomplete');
}

function safeResult(status, code, states = []) {
  return {
    schema: 'risck-comply.a09-production-bindings-readback.v1',
    status, code, verified: status === 'VERIFIED',
    formalGateAccepted: false,
    scope: 'A-09/BIL-01 six canonical Vercel Production Price bindings only',
    provider: 'Vercel read-only GET',
    target: 'production', checkedKeys: A09_KEYS.length, states,
    sensitiveValuesEmitted: false, stripeLifecycleVerified: false,
    productionWritten: false,
  };
}
export async function verifyA09ProductionBindings({
  evidence, token, fetchImpl = fetch, projectId = PROJECT, teamId = TEAM,
} = {}) {
  if (projectId !== PROJECT || teamId !== TEAM) return safeResult('BLOCKED', 'target_authority_mismatch');
  let expected;
  try { expected = expectedA09Prices(evidence); }
  catch { return safeResult('BLOCKED', 'historical_evidence_invalid'); }
  if (typeof token !== 'string' || !token.trim()) return safeResult('BLOCKED', 'vercel_read_token_missing');

  let rows;
  try {
    rows = await readCompleteVercelEnvironmentRows({ fetchImpl, token, projectId, teamId });
  } catch (error) {
    const reason = error?.message;
    const code = reason === 'vercel_environment_listing_invalid'
      ? reason : reason === 'vercel_environment_listing_incomplete'
        ? reason : 'vercel_environment_listing_unavailable';
    return safeResult('BLOCKED', code);
  }

  const states = [];
  for (const key of A09_KEYS) {
    const matches = rows.filter(row => row?.key === key && isExplicitProductionVariable(row));
    if (matches.length !== 1) {
      states.push({ key, state: 'BLOCKED', reason: 'production_binding_missing_or_ambiguous' });
      continue;
    }
    const id = matches[0].id;
    if (typeof id !== 'string' || !ID.test(id)) {
      states.push({ key, state: 'BLOCKED', reason: 'provider_binding_id_invalid' });
      continue;
    }
    let detail;
    try {
      const url = new URL(`https://api.vercel.com/v1/projects/${PROJECT}/env/${encodeURIComponent(id)}`);
      url.searchParams.set('teamId', TEAM);
      detail = await getJson(fetchImpl, url.toString(), token);
    } catch {
      states.push({ key, state: 'BLOCKED', reason: 'provider_binding_value_unavailable' });
      continue;
    }
    // Match provider identity and value in memory. Never log decrypted data.
    const metadataMatches = detail?.id === id && detail?.key === key;
    const valueMatches = metadataMatches && PRICE.test(detail?.value ?? '')
      && detail.value === expected.get(key);
    states.push({
      key,
      state: valueMatches ? 'MATCH' : 'BLOCKED',
      reason: valueMatches ? 'exact_provider_price_id_match' : 'binding_identity_or_value_mismatch',
    });
  }
  const allMatch = states.length === A09_KEYS.length && states.every(s => s.state === 'MATCH');
  return safeResult(allMatch ? 'VERIFIED' : 'BLOCKED',
    allMatch ? 'six_production_bindings_match_historical_catalog' : 'production_binding_verification_failed', states);
}

async function main() {
  const path = resolve('docs/enterprise/evidence/G1_BIL01_LIVE_PRICES_AND_PRODUCTION_ENV_2026-10-22.json');
  const evidence = JSON.parse(readFileSync(path, 'utf8'));
  const result = await verifyA09ProductionBindings({ evidence, token: process.env.VERCEL_TOKEN });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.verified) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch(() => {
    console.error('a09_production_readback_unavailable');
    process.exitCode = 1;
  });
}
