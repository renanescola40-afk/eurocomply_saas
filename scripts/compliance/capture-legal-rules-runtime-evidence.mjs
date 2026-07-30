#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const EVIDENCE_ITEM = 'legal-rules-validation';
const REDACTION_CONFIRMATION = 'Redaction confirmed for runtime evidence.';

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

function assertArtifact(body, expectedSha, deploymentUrl) {
  if (!body || typeof body !== 'object') throw new Error('runtime response must be a JSON object');
  if (body.evidenceItem !== EVIDENCE_ITEM) throw new Error('unexpected runtime evidence item');
  if (body.schema !== 'risck-comply.legal-rules-runtime-evidence.v1') throw new Error('unexpected runtime evidence schema');
  if (body.repository !== REPOSITORY) throw new Error('unexpected runtime evidence repository binding');
  if (body.status !== 'PASS') throw new Error(`runtime evidence is not PASS: ${body.status || 'missing'}`);
  if (body.countsForRuntimeCoverage !== true) throw new Error('PASS runtime evidence must count for runtime coverage');
  if (body.deploymentSha !== expectedSha) throw new Error(`deployment SHA mismatch: expected ${expectedSha}, got ${body.deploymentSha}`);
  if (body.deploymentUrl !== deploymentUrl) throw new Error(`deployment URL mismatch: expected ${deploymentUrl}, got ${body.deploymentUrl}`);
  if (body.environment === 'unknown' || typeof body.environment !== 'string' || !body.environment) throw new Error('runtime evidence environment is missing or unknown');
  if (body.redactionConfirmation !== REDACTION_CONFIRMATION) throw new Error('runtime evidence redaction confirmation is missing');
  if (!Array.isArray(body.sourceRegulations) || !body.sourceRegulations.includes('Regulation (EU) 2026/1744')) {
    throw new Error('runtime evidence is missing the amended source regulation');
  }
  if (!SHA256.test(String(body.rulesDigest || ''))) throw new Error('rulesDigest must be a SHA-256 digest');
  if (!SHA256.test(String(body.artifactSha256 || ''))) throw new Error('artifactSha256 must be a SHA-256 digest');
  if (!Array.isArray(body.testCases) || body.testCases.length < 8) throw new Error('runtime evidence testCases are incomplete');
  if (body.testCases.some((testCase) => testCase?.status !== 'PASS')) throw new Error('one or more runtime test cases failed');
  if (!Array.isArray(body.requestIds) || body.requestIds.length === 0 || body.requestIds.some((value) => !/^[A-Za-z0-9._:-]{8,128}$/.test(String(value)))) {
    throw new Error('request IDs are missing or unsanitised');
  }
  if (body.evidenceIntegrity?.placeholderOnly !== false) throw new Error('PASS runtime evidence cannot be a placeholder');
  if (body.evidenceIntegrity?.runtimeProofInvented !== false) throw new Error('runtime evidence must confirm proof was not invented');
  if (body.evidenceIntegrity?.customerFacingProof !== false) throw new Error('runtime evidence must not claim customer-facing proof');
  if (body.evidenceIntegrity?.containsSensitiveValues !== false) throw new Error('runtime evidence must confirm no sensitive values are stored');

  const { artifactSha256, ...withoutArtifactDigest } = body;
  const expectedDigest = digest(withoutArtifactDigest);
  if (artifactSha256 !== expectedDigest) throw new Error('artifact SHA-256 integrity check failed');

  const serialised = JSON.stringify(body).toLowerCase();
  for (const forbidden of ['authorization', 'set-cookie', 'service_role', 'supabase_db', 'stripe_secret', 'password=']) {
    if (serialised.includes(forbidden)) throw new Error(`runtime artifact contains forbidden material: ${forbidden}`);
  }
}

async function main() {
  const deploymentUrl = normalizeDeploymentUrl(required('DEPLOYMENT_URL'));
  const expectedSha = required('EXPECTED_DEPLOYMENT_SHA').toLowerCase();
  if (!FULL_SHA.test(expectedSha)) throw new Error('EXPECTED_DEPLOYMENT_SHA must be a full lowercase 40-character SHA');

  const outputPath = resolve(process.env.OUTPUT_PATH || 'docs/security/evidence/runtime/legal-rules-validation.json');
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

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(body, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    evidenceItem: body.evidenceItem,
    status: body.status,
    deploymentUrl,
    deploymentSha: body.deploymentSha,
    legalRulesVersion: body.legalRulesVersion,
    testCases: body.testCases.length,
    artifactSha256: body.artifactSha256,
    outputPath,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
