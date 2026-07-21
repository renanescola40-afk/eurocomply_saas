import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const outputArg = process.argv.find((value) => value.startsWith('--output='));
const outputPath = resolve(outputArg?.slice('--output='.length) || 'artifacts/platform-deployment-provenance.json');

const releaseSha = (process.env.RELEASE_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
const productionUrl = (process.env.PRODUCTION_DEPLOYMENT_URL || process.env.NEXT_PUBLIC_APP_URL || '').trim();
const rollbackUrl = (process.env.LAST_KNOWN_GOOD_DEPLOYMENT_URL || '').trim();
const healthToken = (process.env.HEALTHCHECK_TOKEN || '').trim();

const results = [];
const add = (control, status, detail) => results.push({ control, status, detail });

function safeOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function validateUrl(control, value, required) {
  if (!value) {
    add(control, required ? 'FAIL' : 'NOT_CONFIGURED', 'URL is not configured');
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      add(control, 'FAIL', 'Deployment URL must use HTTPS');
      return null;
    }
    if (url.username || url.password) {
      add(control, 'FAIL', 'Deployment URL must not contain credentials');
      return null;
    }
    add(control, 'PASS', `HTTPS origin configured: ${url.origin}`);
    return url;
  } catch {
    add(control, 'FAIL', 'Deployment URL is malformed');
    return null;
  }
}

function extractSha(response, payload) {
  const candidates = [
    response.headers.get('x-build-sha'),
    response.headers.get('x-commit-sha'),
    response.headers.get('x-vercel-git-commit-sha'),
    payload?.buildSha,
    payload?.build_sha,
    payload?.commitSha,
    payload?.commit_sha,
    payload?.releaseSha,
    payload?.release_sha,
  ];
  return candidates.find((value) => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value.trim()))?.trim().toLowerCase() || null;
}

async function probe(label, baseUrl, expectedSha, requireSha) {
  if (!baseUrl) return;
  const endpoints = ['/api/health', '/api/ready'];
  let successfulResponse = null;
  let observedSha = null;

  for (const endpoint of endpoints) {
    const url = new URL(endpoint, baseUrl);
    const headers = { accept: 'application/json' };
    if (healthToken) headers.authorization = `Bearer ${healthToken}`;

    try {
      const response = await fetch(url, {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(12_000),
      });
      const text = await response.text();
      let payload = null;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }

      const sha = extractSha(response, payload);
      if (sha) observedSha = sha;
      add(`${label}:${endpoint}`, response.ok ? 'PASS' : 'FAIL', `HTTP ${response.status}; cache=${response.headers.get('cache-control') || 'missing'}`);
      if (response.ok && !successfulResponse) successfulResponse = { endpoint, status: response.status };
    } catch (error) {
      add(`${label}:${endpoint}`, 'FAIL', `Probe failed: ${error.name || 'Error'}`);
    }
  }

  if (!successfulResponse) {
    add(`${label}:availability`, 'FAIL', 'No health endpoint returned a successful response');
  } else {
    add(`${label}:availability`, 'PASS', `${successfulResponse.endpoint} returned HTTP ${successfulResponse.status}`);
  }

  if (!expectedSha) {
    add(`${label}:sha`, requireSha ? 'FAIL' : 'NOT_PROVEN', 'Expected SHA was not supplied');
  } else if (!observedSha) {
    add(`${label}:sha`, requireSha ? 'FAIL' : 'NOT_PROVEN', 'Deployment did not expose a verifiable build SHA');
  } else if (observedSha !== expectedSha) {
    add(`${label}:sha`, 'FAIL', `Observed SHA does not match expected ${expectedSha}`);
  } else {
    add(`${label}:sha`, 'PASS', `Deployment proves exact SHA ${expectedSha}`);
  }
}

if (!/^[a-f0-9]{40}$/.test(releaseSha)) {
  add('release-sha', strict ? 'FAIL' : 'NOT_CONFIGURED', 'RELEASE_SHA must be a full lowercase 40-character SHA');
} else {
  add('release-sha', 'PASS', `Exact release SHA configured: ${releaseSha}`);
}

const production = validateUrl('production-url', productionUrl, strict);
const rollback = validateUrl('rollback-url', rollbackUrl, strict);

if (production && rollback && production.origin === rollback.origin) {
  add('rollback-distinct', 'FAIL', 'Production and last-known-good origins must be distinct immutable deployments');
} else if (production && rollback) {
  add('rollback-distinct', 'PASS', 'Production and rollback origins are distinct');
}

await probe('production', production, releaseSha || null, strict);
await probe('rollback', rollback, null, false);

const failures = results.filter((item) => item.status === 'FAIL');
const report = {
  schema_version: 1,
  evidence_type: 'platform-deployment-provenance',
  repository: process.env.GITHUB_REPOSITORY || 'renanescola40-afk/eurocomply_saas',
  release_sha: /^[a-f0-9]{40}$/.test(releaseSha) ? releaseSha : null,
  generated_at: new Date().toISOString(),
  strict_runtime: strict,
  production_origin: safeOrigin(productionUrl),
  rollback_origin: safeOrigin(rollbackUrl),
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  results,
  limitations: [
    'This validator proves HTTP reachability and deployment-reported SHA only.',
    'It does not mutate Vercel, perform rollback, expose tokens, or prove provider dashboard ownership.',
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Deployment provenance: ${report.status}`);
console.log(`Evidence: ${outputPath}`);
if (failures.length > 0) process.exitCode = 1;
