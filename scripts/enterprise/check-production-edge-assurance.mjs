#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const path = process.env.EDGE_ASSURANCE_EVIDENCE_PATH || 'docs/security/evidence/runtime/production-edge-assurance.json';
const expectedSha = (process.env.ENTERPRISE_EXPECTED_SHA || process.env.GITHUB_SHA || '').toLowerCase();
const evidence = JSON.parse(readFileSync(path, 'utf8'));

const requiredChecks = [
  'httpsOnly',
  'landingReachable',
  'healthReachable',
  'securityHeaders',
  'healthNoStore',
  'securityTxtPublished',
  'vulnerabilityPagePublished',
  'trustCenterPublished',
  'edgeProviderObservable',
  'boundedBurstHandled',
];

const failures = [];
if (evidence.schema !== 'risck-comply.production-edge-assurance.v1') failures.push('schema');
if (evidence.status !== 'Complete' || evidence.outcome !== 'passed') failures.push('status');
if (!evidence.generatedFromRealEvidence) failures.push('real evidence');
if (!/^[0-9a-f]{40}$/.test(evidence.targetSha || '')) failures.push('target SHA');
if (expectedSha && evidence.targetSha !== expectedSha) failures.push('exact SHA mismatch');
if (!evidence.workflowRunId) failures.push('workflow run provenance');
for (const check of requiredChecks) if (evidence.checks?.[check] !== true) failures.push(check);
if (evidence.externalAssurance?.independentSecurityReview !== 'NOT_VERIFIED') failures.push('independent review honesty');
if (evidence.externalAssurance?.penetrationTest !== 'NOT_VERIFIED') failures.push('penetration test honesty');
for (const key of ['storesProductionUrl', 'storesResponseBodies', 'storesTokens', 'storesCustomerData']) {
  if (evidence.redaction?.[key] !== false) failures.push(`redaction:${key}`);
}

const serialized = JSON.stringify(evidence);
if (/https?:\/\//i.test(serialized)) failures.push('raw URL present');
if (/(bearer|password|secret|token)[=:][^,}\s]+/i.test(serialized)) failures.push('secret-like material');

if (failures.length) {
  console.error(`Production edge evidence validation failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('Production edge assurance evidence is valid and exact-SHA bound.');
