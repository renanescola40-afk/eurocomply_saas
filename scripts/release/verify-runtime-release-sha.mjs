#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { evaluateRuntimeReleaseSha } from './runtime-release-sha-contract.mjs';

const evidencePath = 'docs/security/evidence/runtime/runtime-release-sha-validation.json';
const finalEvidencePaths = [
  'docs/security/evidence/runtime/production-final-validation.json',
  'docs/security/evidence/runtime/final-validation-runner.json',
];
const timeoutMs = Number.parseInt(process.env.RELEASE_SHA_TIMEOUT_MS || '10000', 10);

function now() {
  return new Date().toISOString();
}

function firstConfigured(names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function normalizeBaseUrl(value) {
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

function targetHost(baseUrl) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return null;
  }
}

function appendUnique(items, value) {
  return [...new Set([...(Array.isArray(items) ? items : []), value])];
}

function patchFinalEvidence(path, bindingEvidence) {
  if (!existsSync(path)) return;

  try {
    const document = JSON.parse(readFileSync(path, 'utf8'));
    document.runtimeReleaseShaValidation = {
      status: bindingEvidence.status,
      outcome: bindingEvidence.outcome,
      evidencePath,
      expectedCommitSha: bindingEvidence.expectedCommitSha,
      expectedBuildSha: bindingEvidence.expectedBuildSha,
      observedCommitSha: bindingEvidence.observedCommitSha,
      provenance: bindingEvidence.provenance,
      generatedAt: bindingEvidence.generatedAt,
    };

    if (bindingEvidence.outcome !== 'passed') {
      const failureSummary = `Runtime deployment SHA binding failed: ${bindingEvidence.failures.join(', ') || 'unknown_failure'}`;
      document.status = 'Open';
      document.outcome = 'failed';
      document.overallResult = 'failed';
      document.metadataFailures = appendUnique(document.metadataFailures, failureSummary);
      document.releaseGate = 'No-Go: the validated hostname is not proven to serve the expected release SHA.';
      document.summary = 'Release validation failed because the deployed runtime SHA was missing, malformed, or different from the expected release/build SHA.';
    }

    writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
  } catch (error) {
    console.error(`Unable to patch ${path}: ${error instanceof Error ? error.message : 'invalid_json'}`);
    process.exitCode = 1;
  }
}

const generatedAt = now();
const baseUrl = normalizeBaseUrl(firstConfigured([
  'RELEASE_DEPLOYMENT_URL',
  'DEPLOYMENT_URL',
  'RELEASE_PRODUCTION_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
]));
const readinessToken = String(process.env.HEALTHCHECK_TOKEN || '').trim();
const expectedCommitSha = firstConfigured(['RELEASE_COMMIT_SHA', 'GITHUB_SHA']);
const expectedBuildSha = firstConfigured([
  'RELEASE_BUILD_SHA',
  'NEXT_PUBLIC_BUILD_SHA',
  'NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA',
  'GITHUB_SHA',
]);

let endpointStatus = 0;
let cacheControl = '';
let responseBody = null;
let requestError = null;

if (baseUrl && readinessToken) {
  try {
    const response = await fetch(`${baseUrl}/api/ready/release`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${readinessToken}`,
        'User-Agent': 'risck-comply-runtime-sha-verifier/1.0',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });

    endpointStatus = response.status;
    cacheControl = response.headers.get('cache-control') || '';
    responseBody = await response.json().catch(() => null);
  } catch (error) {
    requestError = error instanceof Error ? error.message : 'request_failed';
  }
}

const observedCommitSha = responseBody?.release?.commitSha ?? null;
const evaluation = evaluateRuntimeReleaseSha({
  expectedCommitSha,
  expectedBuildSha,
  observedCommitSha,
  endpointStatus,
  cacheControl,
});

const additionalChecks = [
  { name: 'productionUrlConfigured', passed: Boolean(baseUrl) },
  { name: 'protectedReadinessTokenConfigured', passed: Boolean(readinessToken) },
  { name: 'runtimeReleaseResponseStatusOk', passed: responseBody?.status === 'ok' },
  { name: 'runtimeReleaseMetadataAvailable', passed: responseBody?.release?.available === true },
  {
    name: 'runtimeReleaseProvenanceAccepted',
    passed: responseBody?.release?.provenance === 'vercel' || responseBody?.release?.provenance === 'build-env',
  },
];
const checks = [...additionalChecks, ...evaluation.checks];
const failures = checks.filter((check) => !check.passed).map((check) => check.name);
const passed = failures.length === 0;

const evidence = {
  schema: 'risck-comply.runtime-release-sha-validation.v1',
  evidenceItem: 'runtime-release-sha-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt,
  reviewedAt: generatedAt,
  reviewer: 'RISCK COMPLY release automation',
  releaseTarget: process.env.RELEASE_TARGET || 'production',
  targetHost: baseUrl ? targetHost(baseUrl) : null,
  expectedCommitSha: evaluation.expectedCommitSha,
  expectedBuildSha: evaluation.expectedBuildSha,
  observedCommitSha: evaluation.observedCommitSha,
  provenance: responseBody?.release?.provenance ?? 'unavailable',
  endpointStatus,
  requestError,
  timeoutMs,
  checks,
  failures,
  summary: passed
    ? 'The protected runtime metadata endpoint proved that the validated hostname serves the exact expected release/build SHA.'
    : 'The validated hostname is not proven to serve the expected release/build SHA; release remains No-Go.',
  redactionConfirmation: 'No bearer token, cookie, authorization header, secret value, customer data, or raw response body is stored in this evidence file.',
  evidenceIntegrity: {
    containsSensitiveValues: false,
    valuesRedacted: true,
    authorizationHeaderStored: false,
    cookiesStored: false,
  },
};

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
for (const path of finalEvidencePaths) patchFinalEvidence(path, evidence);

console.log(`Wrote ${evidencePath}`);
if (!passed) {
  console.error('Runtime release SHA validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Runtime release SHA validation passed.');
