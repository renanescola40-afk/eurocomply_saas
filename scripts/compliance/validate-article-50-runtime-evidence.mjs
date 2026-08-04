#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DEFAULT_INPUT = 'artifacts/article-50-runtime/docs/security/evidence/runtime/article-50-operational-validation.json';

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

const targetSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
if (!FULL_SHA.test(targetSha)) throw new Error('TARGET_SHA must be a full lowercase Git SHA');

const input = resolve(process.env.ARTICLE_50_RUNTIME_INPUT || DEFAULT_INPUT);
const document = JSON.parse(readFileSync(input, 'utf8'));
const failures = [];

if (document.schema !== 'risck-comply.eu-ai-act-runtime-evidence.v1') failures.push('invalid schema');
if (document.evidenceItem !== 'article-50-operational-validation') failures.push('invalid evidence item');
if (document.repository !== 'renanescola40-afk/eurocomply_saas') failures.push('invalid repository');
if (document.targetSha !== targetSha) failures.push('stale or mismatched SHA');
if (document.status !== 'PASS') failures.push('status must be PASS');
if (document.environment !== 'ci') failures.push('environment must be ci');
if (document.syntheticData !== true) failures.push('syntheticData must be true');
if (document.countsForRuntimeCoverage !== true) failures.push('runtime coverage flag missing');
if (!Array.isArray(document.testCases) || document.testCases.length < 8) failures.push('insufficient test cases');
if (document.testCases?.some((testCase) => testCase.status !== 'PASS')) failures.push('test case failure');
if (!Array.isArray(document.limitations) || document.limitations.length < 3) failures.push('limitations required');
if (!SHA256.test(String(document.integrity?.sha256 || ''))) failures.push('invalid digest');

const { integrity, ...withoutIntegrity } = document;
if (integrity?.sha256 !== digest(withoutIntegrity)) failures.push('digest mismatch');

for (const invariant of [
  'exactSha',
  'failClosedEffectiveDates',
  'providerDeployerSeparation',
  'tenantIsolationContract',
  'versionedAssessments',
  'evidenceScopeValidation',
  'safeDashboardDeadlineView',
]) {
  if (document.controls?.[invariant] !== true) failures.push(`missing invariant: ${invariant}`);
}

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: 'PASS', targetSha, digest: integrity.sha256 }));
