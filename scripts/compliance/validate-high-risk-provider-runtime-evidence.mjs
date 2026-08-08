#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const INPUT = process.env.HIGH_RISK_PROVIDER_EVIDENCE_INPUT ||
  'artifacts/high-risk-provider-runtime/docs/security/evidence/runtime/high-risk-provider-validation.json';

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

const evidence = JSON.parse(readFileSync(resolve(INPUT), 'utf8'));
const failures = [];
if (evidence.schema !== 'risck-comply.eu-ai-act-runtime-evidence.v1') failures.push('schema');
if (evidence.evidenceItem !== 'high-risk-provider-validation') failures.push('evidenceItem');
if (evidence.workstream !== 'HIGH-RISK-PROVIDER') failures.push('workstream');
if (evidence.repository !== REPOSITORY) failures.push('repository');
if (evidence.targetSha !== targetSha) failures.push('targetSha');
if (evidence.environment !== 'ci') failures.push('environment');
if (evidence.status !== 'PASS') failures.push('status');
if (evidence.syntheticData !== true) failures.push('syntheticData');
if (evidence.countsForRuntimeCoverage !== true) failures.push('countsForRuntimeCoverage');
if (!SHA256.test(String(evidence.sourceDigest || ''))) failures.push('sourceDigest');
if (!Array.isArray(evidence.controlsVerified) || evidence.controlsVerified.length < 10) failures.push('controlsVerified');
if (!Array.isArray(evidence.testCases) || evidence.testCases.length !== evidence.controlsVerified?.length) failures.push('testCases');
if (evidence.testCases?.some((item) => item?.status !== 'PASS')) failures.push('testCases.status');
if (!Array.isArray(evidence.limitations) || evidence.limitations.length < 3) failures.push('limitations');
if (evidence.evidenceIntegrity?.exactShaBound !== true) failures.push('exactShaBound');
if (evidence.evidenceIntegrity?.sourceDigestBound !== true) failures.push('sourceDigestBound');
if (evidence.evidenceIntegrity?.containsSensitiveValues !== false) failures.push('containsSensitiveValues');
if (evidence.evidenceIntegrity?.customerFacingProof !== false) failures.push('customerFacingProof');
if (evidence.evidenceIntegrity?.runtimeProofInvented !== false) failures.push('runtimeProofInvented');
const { integritySha256, ...withoutIntegrity } = evidence;
if (!SHA256.test(String(integritySha256 || '')) || integritySha256 !== digest(withoutIntegrity)) failures.push('integritySha256');

if (failures.length) {
  console.error(`High-risk provider runtime evidence invalid: ${[...new Set(failures)].join(', ')}`);
  process.exit(1);
}
console.log(`High-risk provider runtime evidence valid for ${targetSha}.`);
