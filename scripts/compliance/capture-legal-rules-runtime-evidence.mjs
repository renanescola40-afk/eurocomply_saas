#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';

const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const EVIDENCE_ITEM = 'legal-rules-validation';
const REDACTION_CONFIRMATION = 'Redaction confirmed for runtime evidence.';
const MAX_ARTIFACT_BYTES = 100_000;
const ARTIFACT_KEYS = new Set([
  'evidenceItem',
  'schema',
  'repository',
  'environment',
  'deploymentUrl',
  'deploymentSha',
  'legalRulesVersion',
  'sourceRegulations',
  'effectiveDate',
  'effectiveDateMeaning',
  'rulesDigest',
  'testCases',
  'status',
  'timestamp',
  'reviewer',
  'reviewedAt',
  'summary',
  'evidenceLocations',
  'requestIds',
  'redactionConfirmation',
  'countsForRuntimeCoverage',
  'evidenceIntegrity',
  'evidenceBoundary',
  'artifactSha256',
]);
const TEST_CASE_KEYS = new Set(['id', 'description', 'expected', 'actual', 'status']);
const INTEGRITY_KEYS = new Set([
  'placeholderOnly',
  'runtimeProofInvented',
  'customerFacingProof',
  'containsSensitiveValues',
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function normalizeDeploymentUrl(value) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('DEPLOYMENT_URL must not contain credentials, query parameters or fragments');
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('DEPLOYMENT_URL must use HTTPS outside local development');
  }
  return url.origin;
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const keys = Object.keys(value);
  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) {
    throw new Error(`${label} contains unexpected or missing fields`);
  }
}

function assertSafeRepositoryPath(value) {
  return typeof value === 'string'
    && value.length >= 3
    && value.length <= 240
    && !value.startsWith('/')
    && !value.includes('..')
    && /^[A-Za-z0-9._/@\[\]-]+$/.test(value);
}

function assertArtifact(body, expectedSha, deploymentUrl) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('runtime response must be a JSON object');
  assertExactKeys(body, ARTIFACT_KEYS, 'runtime evidence');
  if (body.evidenceItem !== EVIDENCE_ITEM) throw new Error('unexpected runtime evidence item');
  if (body.schema !== 'risck-comply.legal-rules-runtime-evidence.v1') throw new Error('unexpected runtime evidence schema');
  if (body.repository !== REPOSITORY) throw new Error('unexpected runtime evidence repository binding');
  if (body.status !== 'PASS') throw new Error(`runtime evidence is not PASS: ${body.status || 'missing'}`);
  if (body.countsForRuntimeCoverage !== true) throw new Error('PASS runtime evidence must count for runtime coverage');
  if (body.deploymentSha !== expectedSha) throw new Error(`deployment SHA mismatch: expected ${expectedSha}, got ${body.deploymentSha}`);
  if (body.deploymentUrl !== deploymentUrl) throw new Error(`deployment URL mismatch: expected ${deploymentUrl}, got ${body.deploymentUrl}`);
  if (body.environment === 'unknown' || typeof body.environment !== 'string' || !/^[a-z][a-z0-9_-]{1,31}$/i.test(body.environment)) {
    throw new Error('runtime evidence environment is missing, unknown or malformed');
  }
  if (body.redactionConfirmation !== REDACTION_CONFIRMATION) throw new Error('runtime evidence redaction confirmation is missing');
  if (!ISO_TIMESTAMP.test(String(body.timestamp || '')) || !ISO_TIMESTAMP.test(String(body.reviewedAt || ''))) {
    throw new Error('runtime evidence timestamps are missing or malformed');
  }
  if (body.reviewedAt !== body.timestamp) throw new Error('runtime evidence reviewedAt must equal the execution timestamp');
  if (typeof body.reviewer !== 'string' || body.reviewer.length < 10 || body.reviewer.length > 120) throw new Error('runtime evidence reviewer is malformed');
  if (typeof body.summary !== 'string' || body.summary.length < 40 || body.summary.length > 500) throw new Error('runtime evidence summary is malformed');
  if (typeof body.evidenceBoundary !== 'string' || body.evidenceBoundary.length < 40 || body.evidenceBoundary.length > 800) {
    throw new Error('runtime evidence boundary is malformed');
  }
  if (!Array.isArray(body.evidenceLocations) || body.evidenceLocations.length < 4 || body.evidenceLocations.some((value) => !assertSafeRepositoryPath(value))) {
    throw new Error('runtime evidence locations are missing or unsafe');
  }
  if (!Array.isArray(body.sourceRegulations)
    || body.sourceRegulations.length !== 2
    || body.sourceRegulations[0] !== 'Regulation (EU) 2024/1689'
    || body.sourceRegulations[1] !== 'Regulation (EU) 2026/1744') {
    throw new Error('runtime evidence source-regulation set is unexpected');
  }
  if (body.effectiveDate !== '2026-07-27') throw new Error('runtime evidence source effective date is unexpected');
  if (typeof body.effectiveDateMeaning !== 'string' || body.effectiveDateMeaning.length < 40) throw new Error('runtime evidence effective-date meaning is missing');
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(String(body.legalRulesVersion || ''))) throw new Error('runtime evidence legal-rules version is malformed');
  if (!SHA256.test(String(body.rulesDigest || ''))) throw new Error('rulesDigest must be a SHA-256 digest');
  if (!SHA256.test(String(body.artifactSha256 || ''))) throw new Error('artifactSha256 must be a SHA-256 digest');
  if (!Array.isArray(body.testCases) || body.testCases.length < 8 || body.testCases.length > 32) throw new Error('runtime evidence testCases are incomplete');
  for (const testCase of body.testCases) {
    assertExactKeys(testCase, TEST_CASE_KEYS, 'runtime test case');
    if (typeof testCase.id !== 'string' || !/^[a-z0-9-]{3,80}$/.test(testCase.id)) throw new Error('runtime test case id is malformed');
    if (typeof testCase.description !== 'string' || testCase.description.length < 20 || testCase.description.length > 500) {
      throw new Error('runtime test case description is malformed');
    }
    if (testCase.status !== 'PASS') throw new Error('one or more runtime test cases failed');
  }
  if (!Array.isArray(body.requestIds) || body.requestIds.length === 0 || body.requestIds.length > 8
    || body.requestIds.some((value) => !/^[A-Za-z0-9._:-]{8,128}$/.test(String(value)))) {
    throw new Error('request IDs are missing or unsanitised');
  }
  assertExactKeys(body.evidenceIntegrity, INTEGRITY_KEYS, 'runtime evidence integrity');
  if (body.evidenceIntegrity.placeholderOnly !== false) throw new Error('PASS runtime evidence cannot be a placeholder');
  if (body.evidenceIntegrity.runtimeProofInvented !== false) throw new Error('runtime evidence must confirm proof was not invented');
  if (body.evidenceIntegrity.customerFacingProof !== false) throw new Error('runtime evidence must not claim customer-facing proof');
  if (body.evidenceIntegrity.containsSensitiveValues !== false) throw new Error('runtime evidence must confirm no sensitive values are stored');

  const { artifactSha256, ...withoutArtifactDigest } = body;
  const expectedDigest = digest(withoutArtifactDigest);
  if (artifactSha256 !== expectedDigest) throw new Error('artifact SHA-256 integrity check failed');

  const serialised = JSON.stringify(body);
  if (Buffer.byteLength(serialised, 'utf8') > MAX_ARTIFACT_BYTES) throw new Error('runtime artifact exceeds the maximum accepted size');
  const lower = serialised.toLowerCase();
  for (const forbidden of ['authorization', 'set-cookie', 'service_role', 'supabase_db', 'stripe_secret', 'password=']) {
    if (lower.includes(forbidden)) throw new Error(`runtime artifact contains forbidden material: ${forbidden}`);
  }
}

async function main() {
  const deploymentUrl = normalizeDeploymentUrl(required('DEPLOYMENT_URL'));
  const expectedSha = required('EXPECTED_DEPLOYMENT_SHA').toLowerCase();
  if (!FULL_SHA.test(expectedSha)) throw new Error('EXPECTED_DEPLOYMENT_SHA must be a full lowercase 40-character SHA');

  const endpoint = `${deploymentUrl}/api/public/legal-rules-validation`;
  const requestId = `runtime-${randomUUID()}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    redirect: 'error',
    headers: {
      accept: 'application/json',
      'x-request-id': requestId,
      'user-agent': 'risck-comply-legal-rules-runtime-proof/1.0',
    },
  });

  const cacheControl = response.headers.get('cache-control') || '';
  if (!/no-store/i.test(cacheControl)) throw new Error('runtime endpoint must return Cache-Control: no-store');
  if (response.headers.has('set-cookie')) throw new Error('runtime endpoint must not set cookies');
  if (!String(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    throw new Error('runtime endpoint must return JSON');
  }

  const body = await response.json();
  if (!response.ok) throw new Error(`runtime endpoint returned HTTP ${response.status}: ${body?.status || 'unknown'}`);
  assertArtifact(body, expectedSha, deploymentUrl);

  process.stderr.write(`${JSON.stringify({
    evidenceItem: body.evidenceItem,
    status: body.status,
    deploymentUrl,
    deploymentSha: body.deploymentSha,
    legalRulesVersion: body.legalRulesVersion,
    testCases: body.testCases.length,
    artifactSha256: body.artifactSha256,
  })}\n`);
  process.stdout.write(`${JSON.stringify(body, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
