#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'distributed-rate-limit-sensitive-endpoints.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const requiredControls = [
  'Rate limit state is shared across instances',
  'Sensitive endpoints have explicit policies',
  'Bypass paths are documented or blocked',
  'Alerting exists for sustained throttling or abuse',
  'Evidence contains no secrets',
];

function fail(message) {
  console.error(`P1 distributed rate limit evidence check failed: ${message}`);
  process.exit(1);
}

function hasControl(controls, expected) {
  return controls.some((control) => String(control).trim().toLowerCase() === expected.toLowerCase());
}

if (!fs.existsSync(evidencePath)) {
  console.log(`P1 distributed rate limit evidence is open: ${evidencePath} is not present yet.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
}

if (placeholderPattern.test(JSON.stringify(evidence))) fail('evidence must not contain placeholders');
if (evidence.control !== 'distributed-rate-limit-sensitive-endpoints') fail('control must be distributed-rate-limit-sensitive-endpoints');
if (!['Complete', 'Exception'].includes(evidence.status)) fail('status must be Complete or Exception');
if (evidence.redaction !== requiredRedaction) fail('redaction statement is missing or invalid');
if (!evidence.reviewedAt || !evidence.reviewer || !evidence.targetEnvironment) fail('reviewedAt, reviewer, and targetEnvironment are required');

if (!evidence.rateLimitBackend || evidence.rateLimitBackend.scope !== 'distributed' || !evidence.rateLimitBackend.provider || !evidence.rateLimitBackend.evidenceLocation) fail('rateLimitBackend must identify a distributed backend provider and evidenceLocation');

if (!Array.isArray(evidence.sensitiveEndpointsReviewed) || evidence.sensitiveEndpointsReviewed.length === 0) fail('sensitiveEndpointsReviewed must include at least one endpoint');
for (const endpoint of evidence.sensitiveEndpointsReviewed) {
  if (!endpoint.endpoint || !endpoint.category || !endpoint.limitPolicy || !endpoint.keyingStrategy || !endpoint.status || !endpoint.evidenceLocation) fail('each sensitive endpoint must include endpoint, category, limitPolicy, keyingStrategy, status, and evidenceLocation');
  if (evidence.status === 'Complete' && endpoint.status !== 'enforced') fail(`${endpoint.endpoint} must have status enforced for Complete evidence`);
}

if (!Array.isArray(evidence.controlsVerified)) fail('controlsVerified must be an array');
for (const control of requiredControls) {
  if (!hasControl(evidence.controlsVerified, control)) fail(`controlsVerified must include: ${control}`);
}

if (!evidence.nextReviewDue) fail('nextReviewDue is required');

if (evidence.status === 'Exception') {
  if (!evidence.exception || !evidence.exception.riskOwner || !evidence.exception.rationale || !evidence.exception.expiresAt || !evidence.exception.approvalReference) fail('Exception evidence requires riskOwner, rationale, expiresAt, and approvalReference');
  if (!Array.isArray(evidence.exception.compensatingControls) || evidence.exception.compensatingControls.length === 0) fail('Exception evidence requires compensatingControls');
}

console.log(`P1 distributed rate limit evidence is valid: ${evidencePath}`);
