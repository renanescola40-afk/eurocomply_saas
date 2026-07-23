#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const EXPECTED = ['READINESS-SCORING', 'VENDOR-ASSURANCE', 'PLATFORM-CONTROLS'];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

export function validateFinalRuntimeDocument(document, expectedSha) {
  const failures = [];
  if (!document || typeof document !== 'object') return ['document_must_be_object'];
  if (document.repository !== 'renanescola40-afk/eurocomply_saas') failures.push('repository_mismatch');
  if (!FULL_SHA.test(String(document.targetSha || ''))) failures.push('target_sha_invalid');
  if (expectedSha && document.targetSha !== expectedSha) failures.push('target_sha_mismatch');
  if (!EXPECTED.includes(document.workstreamId)) failures.push('workstream_invalid');
  if (document.status !== 'VERIFIED') failures.push('status_not_verified');
  if (!Array.isArray(document.assertions) || document.assertions.length === 0) failures.push('assertions_missing');
  if (document.assertions?.some((item) => item.status !== 'VERIFIED')) failures.push('assertion_not_verified');
  if (!SHA256.test(String(document.integrity?.sha256 || ''))) failures.push('integrity_invalid');
  const body = { ...document };
  delete body.integrity;
  const digest = createHash('sha256').update(JSON.stringify(stable(body))).digest('hex');
  if (document.integrity?.sha256 !== digest) failures.push('integrity_mismatch');
  return failures;
}

export function evaluateFinalRuntimeBundle({ root, expectedSha }) {
  const results = EXPECTED.map((workstreamId) => {
    const path = join(root, `${workstreamId.toLowerCase()}.json`);
    if (!existsSync(path)) return { workstreamId, state: 'missing', failures: ['file_missing'] };
    try {
      const document = JSON.parse(readFileSync(path, 'utf8'));
      const failures = validateFinalRuntimeDocument(document, expectedSha);
      return { workstreamId, state: failures.length ? 'invalid' : 'accepted', failures };
    } catch {
      return { workstreamId, state: 'invalid', failures: ['invalid_json'] };
    }
  });
  const accepted = results.filter((item) => item.state === 'accepted').length;
  return { schema: 'risck-comply.final-runtime-assurance-report.v1', expectedSha, passed: accepted === EXPECTED.length, accepted, total: EXPECTED.length, results };
}

function main() {
  const root = process.env.FINAL_RUNTIME_ASSURANCE_ROOT || 'artifacts/final-runtime-assurance';
  const expectedSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
  const report = evaluateFinalRuntimeBundle({ root, expectedSha });
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1]?.endsWith('validate-final-runtime-assurance.mjs')) main();
