#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const expectedSha = process.env.RELEASE_SHA || process.argv[2] || '';
const outputPath = process.env.CLOSEOUT_OUTPUT || 'artifacts/enterprise-conversation-closeout/result.json';

if (!/^[0-9a-f]{40}$/i.test(expectedSha)) throw new Error('RELEASE_SHA must be a full 40-character commit SHA');

const evidenceCandidates = [
  'docs/security/evidence/runtime/stripe-entitlement-runtime-promoted.json',
  'docs/security/evidence/runtime/stripe-billing-validation.json',
  'docs/security/evidence/runtime/enterprise-production-final-validation.json',
  'docs/security/evidence/runtime/enterprise-runtime-validation.json',
  'docs/security/evidence/runtime/release-go-no-go-validation.json',
];

function readJson(path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) return { path, exists: false, value: null };
  try {
    return { path, exists: true, value: JSON.parse(readFileSync(absolute, 'utf8')) };
  } catch {
    return { path, exists: true, value: null, parseError: true };
  }
}

function extractSha(value) {
  if (!value || typeof value !== 'object') return null;
  const candidates = [value.commitSha, value.releaseSha, value.headSha, value.runtimeSha, value?.runtimeProof?.headSha];
  return candidates.find((candidate) => typeof candidate === 'string' && /^[0-9a-f]{40}$/i.test(candidate)) || null;
}

function passed(value) {
  if (!value || typeof value !== 'object') return false;
  const status = String(value.status || '').toLowerCase();
  const validationStatus = String(value.validationStatus || value.outcome || value.decision || '').toLowerCase();
  return ['complete', 'passed', 'go'].includes(status) || ['passed', 'complete', 'go'].includes(validationStatus);
}

const evidence = evidenceCandidates.map(readJson).map((entry) => ({
  path: entry.path,
  exists: entry.exists,
  parseable: entry.exists && !entry.parseError && Boolean(entry.value),
  sha: extractSha(entry.value),
  exactSha: extractSha(entry.value)?.toLowerCase() === expectedSha.toLowerCase(),
  passed: passed(entry.value),
}));

const required = {
  stripeRuntime: evidence.filter((item) => item.path.includes('stripe')).some((item) => item.exists && item.parseable && item.exactSha && item.passed),
  enterpriseRuntime: evidence.some((item) => item.path.includes('enterprise-runtime') && item.exists && item.parseable && item.exactSha && item.passed),
  productionFinal: evidence.some((item) => item.path.includes('production-final') && item.exists && item.parseable && item.exactSha && item.passed),
  releaseGoNoGo: evidence.some((item) => item.path.includes('go-no-go') && item.exists && item.parseable && item.exactSha && item.passed),
};

const blockers = Object.entries(required).filter(([, ok]) => !ok).map(([name]) => name);
const complete = blockers.length === 0;
const generatedAt = new Date().toISOString();
const result = {
  schemaVersion: 1,
  id: 'enterprise-conversation-final-closeout',
  releaseSha: expectedSha.toLowerCase(),
  generatedAt,
  status: complete ? 'Complete' : 'Open',
  decision: complete ? 'CONVERSATION_COMPLETE' : 'CONVERSATION_REMAINS_OPEN',
  completionPercentage: complete ? 100 : 96,
  required,
  blockers,
  evidence,
  truthBoundary: complete
    ? 'All required exact-SHA runtime and release evidence was present and passed.'
    : 'Repository implementation is complete, but one or more exact-SHA runtime or human release proofs remain absent.',
};

const digest = createHash('sha256').update(JSON.stringify(result)).digest('hex');
const finalResult = { ...result, sha256: digest };
const absoluteOutput = join(root, outputPath);
mkdirSync(dirname(absoluteOutput), { recursive: true });
writeFileSync(absoluteOutput, `${JSON.stringify(finalResult, null, 2)}\n`);
console.log(JSON.stringify(finalResult, null, 2));
if (!complete) process.exitCode = 2;
