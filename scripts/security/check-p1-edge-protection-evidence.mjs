import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'waf-cdn-ddos.json');

const requiredControls = [
  'WAF is enabled for production traffic',
  'CDN or edge routing is enabled for production traffic',
  'DDoS protection is enabled for production traffic',
  'Security events or mitigations are observable',
  'Evidence contains no secrets',
];

function fail(message) {
  console.error(`[p1-edge-protection] ${message}`);
  process.exit(1);
}

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${field} must be a non-empty string`);
  }
}

function assertNoPlaceholders(value, field = 'evidence') {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const forbidden = ['REPLACE_', 'YYYY-MM-DD', 'placeholder', 'TODO'];
  const matched = forbidden.find((token) => serialized.includes(token));
  if (matched) {
    fail(`${field} contains placeholder token: ${matched}`);
  }
}

function assertEnabledControls(items, field, requireMode = false) {
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
  }
}

if (!fs.existsSync(evidencePath)) {
  console.log(`[p1-edge-protection] No final evidence file found at ${evidencePath}; control remains open.`);
  process.exit(0);
}

const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
assertNoPlaceholders(evidence);

if (evidence.control !== 'waf-cdn-ddos') {
  fail('control must be waf-cdn-ddos');
}

if (!['Complete', 'Exception'].includes(evidence.status)) {
  fail('status must be Complete or Exception');
}

assertString(evidence.reviewedAt, 'reviewedAt');
assertString(evidence.reviewer, 'reviewer');
assertString(evidence.targetEnvironment, 'targetEnvironment');

if (evidence.redactionStatement !== 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.') {
  fail('redactionStatement must confirm secrets and access-granting values are redacted');
}

if (!evidence.edgeProtectionReviewed || typeof evidence.edgeProtectionReviewed !== 'object') {
  fail('edgeProtectionReviewed is required');
}
assertString(evidence.edgeProtectionReviewed.provider, 'edgeProtectionReviewed.provider');
assertString(evidence.edgeProtectionReviewed.evidenceLocation, 'edgeProtectionReviewed.evidenceLocation');
if (!Array.isArray(evidence.edgeProtectionReviewed.zonesOrApplications) || evidence.edgeProtectionReviewed.zonesOrApplications.length === 0) {
  fail('edgeProtectionReviewed.zonesOrApplications must list production zones or applications');
}

assertEnabledControls(evidence.wafControlsReviewed, 'wafControlsReviewed', true);
assertEnabledControls(evidence.cdnControlsReviewed, 'cdnControlsReviewed');
assertEnabledControls(evidence.ddosControlsReviewed, 'ddosControlsReviewed');

if (evidence.status === 'Complete') {
  for (const [index, item] of evidence.wafControlsReviewed.entries()) {
    if (!item.enabled) fail(`wafControlsReviewed[${index}] must be enabled for Complete evidence`);
    if (!['enforce', 'block', 'protect'].includes(item.mode)) {
      fail(`wafControlsReviewed[${index}].mode must be enforce, block, or protect for Complete evidence`);
    }
  }
  for (const [index, item] of evidence.cdnControlsReviewed.entries()) {
    if (!item.enabled) fail(`cdnControlsReviewed[${index}] must be enabled for Complete evidence`);
  }
  for (const [index, item] of evidence.ddosControlsReviewed.entries()) {
    if (!item.enabled) fail(`ddosControlsReviewed[${index}] must be enabled for Complete evidence`);
  }
}

if (!Array.isArray(evidence.controlsVerified)) {
  fail('controlsVerified must be an array');
}
for (const control of requiredControls) {
  if (!evidence.controlsVerified.includes(control)) {
    fail(`controlsVerified must include: ${control}`);
  }
}

assertString(evidence.nextReviewDue, 'nextReviewDue');

if (evidence.status === 'Exception') {
  if (!evidence.exception || typeof evidence.exception !== 'object') {
    fail('Exception status requires exception object');
  }
  assertString(evidence.exception.riskOwner, 'exception.riskOwner');
  assertString(evidence.exception.rationale, 'exception.rationale');
  assertString(evidence.exception.expiresAt, 'exception.expiresAt');
  assertString(evidence.exception.approvalReference, 'exception.approvalReference');
  if (!Array.isArray(evidence.exception.compensatingControls) || evidence.exception.compensatingControls.length === 0) {
    fail('exception.compensatingControls must list compensating controls');
  }
}

console.log(`[p1-edge-protection] Evidence validated at ${evidencePath}`);
