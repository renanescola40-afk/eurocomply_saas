#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'waf-cdn-ddos.input.json');
const outputPath = process.argv[3] || path.join('docs', 'security', 'evidence', 'p1', 'waf-cdn-ddos.json');

const requiredRedactionStatement = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredControls = [
  'WAF is enabled for production traffic',
  'CDN or edge routing is enabled for production traffic',
  'DDoS protection is enabled for production traffic',
  'Security events or mitigations are observable',
  'Evidence contains no secrets',
];

function fail(message) {
  console.error(`[p1-edge-builder] ${message}`);
  process.exit(1);
}

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${field} must be a non-empty string`);
  }
}

function assertNoPlaceholders(value, field = 'input') {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const matched = ['REPLACE_', 'YYYY-MM-DD', 'placeholder', 'TODO'].find((token) => serialized.includes(token));
  if (matched) {
    fail(`${field} contains placeholder token: ${matched}`);
  }
}

function assertReviewedControls(items, field, requireMode = false, status) {
  if (!Array.isArray(items) || items.length === 0) {
    fail(`${field} must include at least one reviewed control`);
  }

  for (const [index, item] of items.entries()) {
    assertString(item.controlName, `${field}[${index}].controlName`);
    assertString(item.scope, `${field}[${index}].scope`);
    assertString(item.evidenceLocation, `${field}[${index}].evidenceLocation`);
    if (typeof item.enabled !== 'boolean') {
      fail(`${field}[${index}].enabled must be a boolean`);
    }
    if (requireMode) {
      assertString(item.mode, `${field}[${index}].mode`);
    }
    if (status === 'Complete' && !item.enabled) {
      fail(`${field}[${index}] must be enabled for Complete evidence`);
    }
  }
}

if (!fs.existsSync(inputPath)) {
  fail(`input file is required: ${inputPath}`);
}

let input;
try {
  input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${inputPath}: ${error.message}`);
}

assertNoPlaceholders(input);

if (!['Complete', 'Exception'].includes(input.status)) {
  fail('status must be Complete or Exception');
}

assertString(input.reviewedAt, 'reviewedAt');
assertString(input.reviewer, 'reviewer');
assertString(input.targetEnvironment, 'targetEnvironment');

if (!input.edgeProtectionReviewed || typeof input.edgeProtectionReviewed !== 'object') {
  fail('edgeProtectionReviewed is required');
}
assertString(input.edgeProtectionReviewed.provider, 'edgeProtectionReviewed.provider');
assertString(input.edgeProtectionReviewed.evidenceLocation, 'edgeProtectionReviewed.evidenceLocation');
if (!Array.isArray(input.edgeProtectionReviewed.zonesOrApplications) || input.edgeProtectionReviewed.zonesOrApplications.length === 0) {
  fail('edgeProtectionReviewed.zonesOrApplications must list production zones or applications');
}

assertReviewedControls(input.wafControlsReviewed, 'wafControlsReviewed', true, input.status);
assertReviewedControls(input.cdnControlsReviewed, 'cdnControlsReviewed', false, input.status);
assertReviewedControls(input.ddosControlsReviewed, 'ddosControlsReviewed', false, input.status);

if (input.status === 'Complete') {
  for (const [index, item] of input.wafControlsReviewed.entries()) {
    if (!['enforce', 'block', 'protect'].includes(item.mode)) {
      fail(`wafControlsReviewed[${index}].mode must be enforce, block, or protect for Complete evidence`);
    }
  }
}

if (!Array.isArray(input.controlsVerified)) {
  fail('controlsVerified must be an array');
}
for (const control of requiredControls) {
  if (!input.controlsVerified.includes(control)) {
    fail(`controlsVerified must include: ${control}`);
  }
}

assertString(input.nextReviewDue, 'nextReviewDue');

const evidence = {
  control: 'waf-cdn-ddos',
  status: input.status,
  redactionStatement: requiredRedactionStatement,
  reviewedAt: input.reviewedAt,
  reviewer: input.reviewer,
  targetEnvironment: input.targetEnvironment,
  edgeProtectionReviewed: input.edgeProtectionReviewed,
  wafControlsReviewed: input.wafControlsReviewed,
  cdnControlsReviewed: input.cdnControlsReviewed,
  ddosControlsReviewed: input.ddosControlsReviewed,
  controlsVerified: input.controlsVerified,
  nextReviewDue: input.nextReviewDue,
};

if (input.status === 'Exception') {
  if (!input.exception || typeof input.exception !== 'object') {
    fail('Exception status requires exception object');
  }
  for (const field of ['riskOwner', 'rationale', 'expiresAt', 'approvalReference']) {
    assertString(input.exception[field], `exception.${field}`);
  }
  if (!Array.isArray(input.exception.compensatingControls) || input.exception.compensatingControls.length === 0) {
    fail('exception.compensatingControls must be a non-empty array');
  }
  evidence.exception = input.exception;
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`[p1-edge-builder] wrote ${outputPath}`);
