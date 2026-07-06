#!/usr/bin/env node

import http from 'node:http';
import https from 'node:https';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const evidencePath = 'docs/security/evidence/runtime/rollback-dry-run-validation.json';
const shaPattern = /^[a-f0-9]{40}$/i;
const timeoutMs = Number.parseInt(process.env.RELEASE_ROLLBACK_TIMEOUT_MS || '10000', 10);
const generatedAt = new Date().toISOString();

function firstConfigured(names) {
  for (const name of names) {
    const value = (process.env[name] || '').trim();
    if (value) return { name, value };
  }

  return null;
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(candidate);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function route(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString();
}

function headerValue(headers, name) {
  const raw = headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw.join(', ');
  return String(raw || '');
}

function hasNoStore(headers) {
  return /\bno-store\b/i.test(headerValue(headers, 'cache-control'));
}

function safeResponseSummary(response) {
  return {
    status: response.status,
    error: response.error ?? null,
    contentType: headerValue(response.headers, 'content-type') || null,
    cacheControl: headerValue(response.headers, 'cache-control') || null,
    bodyStatus: response.body?.status ?? null,
  };
}

function request(url, options = {}) {
  const { method = 'GET', accept = 'application/json', headers = {} } = options;

  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve({ status: 0, headers: {}, body: null, error: 'invalid_url' });
      return;
    }

    const client = parsed.protocol === 'http:' ? http : https;
    const req = client.request(parsed, {
      method,
      timeout: timeoutMs,
      headers: {
        Accept: accept,
        'User-Agent': 'risck-comply-rollback-dry-run/2.0',
        ...headers,
      },
    }, (response) => {
      let bodyText = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        bodyText += chunk;
      });
      response.on('end', () => {
        let body = null;
        const contentType = headerValue(response.headers, 'content-type');
        if (contentType.includes('application/json') || bodyText.trim().startsWith('{')) {
          try {
            body = bodyText ? JSON.parse(bodyText) : null;
          } catch {
            body = { parseError: 'non_json_response' };
          }
        }

        resolve({
          status: response.statusCode || 0,
          headers: response.headers,
          body,
        });
      });
    });

    req.on('timeout', () => req.destroy(new Error('request_timeout')));
    req.on('error', (error) => resolve({ status: 0, headers: {}, body: null, error: error.message }));
    req.end();
  });
}

function createCheck(name, passed, details = {}, critical = true) {
  return { name, critical, passed: Boolean(passed), details };
}

const targetUrlConfig = firstConfigured([
  'RELEASE_ROLLBACK_TARGET_URL',
  'RELEASE_ROLLBACK_TARGET',
  'ROLLBACK_TARGET_URL',
  'ROLLBACK_TARGET',
  'PREVIOUS_KNOWN_GOOD_URL',
  'LAST_KNOWN_GOOD_DEPLOYMENT_URL',
  'VERCEL_ROLLBACK_DEPLOYMENT_URL',
]);
const targetShaConfig = firstConfigured([
  'RELEASE_ROLLBACK_TARGET_SHA',
  'ROLLBACK_TARGET_SHA',
  'PREVIOUS_KNOWN_GOOD_SHA',
  'LAST_KNOWN_GOOD_SHA',
]);
const targetUrl = normalizeUrl(targetUrlConfig?.value);
const targetSha = targetShaConfig?.value || '';
const currentSha = process.env.GITHUB_SHA || process.env.RELEASE_CURRENT_SHA || process.env.RELEASE_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';
const targetValidationProof = process.env.RELEASE_ROLLBACK_TARGET_VALIDATED === 'true';

const checks = [
  createCheck('rollbackTargetUrlConfigured', Boolean(targetUrlConfig?.value), { source: targetUrlConfig?.name ?? null }),
  createCheck('rollbackTargetUrlValid', Boolean(targetUrl), { source: targetUrlConfig?.name ?? null }),
  createCheck('rollbackTargetShaConfigured', shaPattern.test(targetSha), {
    source: targetShaConfig?.name ?? null,
    shaPrefix: targetSha ? `${targetSha.slice(0, 12)}…` : null,
  }),
  createCheck('rollbackTargetDiffersFromCurrentRelease', !(currentSha && currentSha === targetSha), {
    currentShaPresent: Boolean(currentSha),
    targetShaPresent: Boolean(targetSha),
  }),
  createCheck('rollbackRunbookPresent', existsSync('docs/operations/ROLLBACK_RUNBOOK.md'), {
    path: 'docs/operations/ROLLBACK_RUNBOOK.md',
  }),
  createCheck('legacyRollbackPlanPresent', existsSync('docs/RELEASE_ROLLBACK_PLAN.md'), {
    path: 'docs/RELEASE_ROLLBACK_PLAN.md',
  }, false),
  createCheck('functionalValidationProofRecorded', targetValidationProof, {
    requiredEnv: 'RELEASE_ROLLBACK_TARGET_VALIDATED=true',
  }),
];

let rollbackHealth = null;
if (targetUrl) {
  rollbackHealth = await request(route(targetUrl, '/api/health'));
  checks.push(createCheck('rollbackTargetHealthOk', rollbackHealth.status === 200 && rollbackHealth.body?.status === 'ok', safeResponseSummary(rollbackHealth)));
  checks.push(createCheck('rollbackTargetHealthNoStore', hasNoStore(rollbackHealth.headers), safeResponseSummary(rollbackHealth)));
} else {
  checks.push(createCheck('rollbackTargetHealthOk', false, { skipped: true, reason: 'missing_valid_rollback_target_url' }));
  checks.push(createCheck('rollbackTargetHealthNoStore', false, { skipped: true, reason: 'missing_valid_rollback_target_url' }));
}

const readinessToken = (process.env.HEALTHCHECK_TOKEN || '').trim();
const runReadyCheck = process.env.RELEASE_ROLLBACK_CHECK_READY === 'true';
let rollbackReady = null;
if (targetUrl && runReadyCheck && readinessToken) {
  rollbackReady = await request(route(targetUrl, '/api/ready'), {
    headers: { Authorization: `Bearer ${readinessToken}` },
  });
  checks.push(createCheck('rollbackTargetReadyOk', rollbackReady.status === 200 && rollbackReady.body?.status === 'ready', safeResponseSummary(rollbackReady)));
  checks.push(createCheck('rollbackTargetReadyNoStore', hasNoStore(rollbackReady.headers), safeResponseSummary(rollbackReady)));
} else {
  checks.push(createCheck('rollbackTargetReadyOk', !runReadyCheck, {
    skipped: !runReadyCheck,
    reason: runReadyCheck ? 'missing_target_or_healthcheck_token' : 'set RELEASE_ROLLBACK_CHECK_READY=true to verify protected readiness on the rollback target',
  }, false));
}

const failures = checks
  .filter((check) => check.critical && !check.passed)
  .map((check) => check.name);
const outcome = failures.length === 0 ? 'passed' : 'failed';

const evidence = {
  evidenceItem: 'rollback-dry-run-validation',
  status: outcome === 'passed' ? 'Complete' : 'Open',
  outcome,
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY release automation',
  releaseTarget: process.env.RELEASE_TARGET || 'production',
  summary: outcome === 'passed'
    ? 'Rollback dry-run verified previous known-good metadata, public health, no-store controls, and functional validation proof without mutating production.'
    : 'Rollback dry-run evidence is incomplete or the rollback target failed runtime validation; release remains blocked.',
  redactionConfirmation: 'Redaction confirmed: no token, cookie, authorization header, secret value, or raw rollback URL is written to this evidence file.',
  evidenceLocations: [
    'scripts/release/run-rollback-dry-run.mjs',
    'docs/operations/ROLLBACK_RUNBOOK.md',
    'docs/RELEASE_ROLLBACK_PLAN.md',
    evidencePath,
  ],
  controlsVerified: outcome === 'passed'
    ? checks.filter((check) => check.critical && check.passed).map((check) => check.name)
    : [],
  rollbackTarget: {
    urlConfigured: Boolean(targetUrlConfig?.value),
    urlValid: Boolean(targetUrl),
    urlSource: targetUrlConfig?.name ?? null,
    shaSource: targetShaConfig?.name ?? null,
    shaPrefix: targetSha ? `${targetSha.slice(0, 12)}…` : null,
    shaFullRecordedPrivately: shaPattern.test(targetSha),
    health: rollbackHealth ? safeResponseSummary(rollbackHealth) : null,
    readinessChecked: Boolean(rollbackReady),
    readiness: rollbackReady ? safeResponseSummary(rollbackReady) : null,
  },
  dryRun: {
    mutatesProduction: false,
    commandMode: 'metadata-plus-network-health-validation',
    timeoutMs,
  },
  targetValidation: {
    passed: targetValidationProof,
    requiredEnv: 'RELEASE_ROLLBACK_TARGET_VALIDATED=true',
    note: 'This flag must only be set after manual functional validation of the previous known-good deployment.',
  },
  checks,
  failures,
  releaseGate: outcome === 'passed'
    ? 'Rollback dry-run evidence is present and passed.'
    : 'Release remains blocked until rollback dry-run and target validation are Complete/passed.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
  },
};

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote ${evidencePath}`);

if (failures.length > 0) {
  console.error('Rollback dry-run validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Rollback dry-run validation passed.');
