#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'dast-automated.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const requiredControls = [
  'DAST runs automatically or on demand in CI',
  'Production-like target is scanned',
  'Critical and high findings block completion',
  'Findings are triaged with durable references',
  'Evidence contains no secrets',
];

function fail(message) {
  console.error(`P1 DAST evidence check failed: ${message}`);
  process.exit(1);
}

function hasControl(controls, expected) {
  return controls.some((control) => String(control).trim().toLowerCase() === expected.toLowerCase());
}

if (!fs.existsSync(evidencePath)) {
  console.log(`P1 DAST evidence is open: ${evidencePath} is not present yet.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
}

if (placeholderPattern.test(JSON.stringify(evidence))) fail('evidence must not contain placeholders');
if (evidence.control !== 'dast-automated') fail('control must be dast-automated');
if (!['Complete', 'Exception'].includes(evidence.status)) fail('status must be Complete or Exception');
if (evidence.redaction !== requiredRedaction) fail('redaction statement is missing or invalid');
if (!evidence.reviewedAt || !evidence.reviewer || !evidence.targetEnvironment) fail('reviewedAt, reviewer, and targetEnvironment are required');

if (!evidence.scanner || !evidence.scanner.name || !evidence.scanner.version || !evidence.scanner.profile || !evidence.scanner.evidenceLocation) fail('scanner must include name, version, profile, and evidenceLocation');
if (!Array.isArray(evidence.targetsReviewed) || evidence.targetsReviewed.length === 0) fail('targetsReviewed must include at least one target');
for (const target of evidence.targetsReviewed) {
  if (!target.target || !target.environment || !target.status || !target.evidenceLocation) fail('each target must include target, environment, status, and evidenceLocation');
  if (evidence.status === 'Complete' && target.status !== 'scanned') fail(`${target.target} must have status scanned for Complete evidence`);
}

if (!evidence.findingsSummary || typeof evidence.findingsSummary.critical !== 'number' || typeof evidence.findingsSummary.high !== 'number') fail('findingsSummary must include numeric critical and high counts');
if (evidence.status === 'Complete' && (evidence.findingsSummary.critical > 0 || evidence.findingsSummary.high > 0)) fail('Complete evidence cannot have open critical or high DAST findings');

if (!Array.isArray(evidence.controlsVerified)) fail('controlsVerified must be an array');
for (const control of requiredControls) {
  if (!hasControl(evidence.controlsVerified, control)) fail(`controlsVerified must include: ${control}`);
}

if (!evidence.nextReviewDue) fail('nextReviewDue is required');

if (evidence.status === 'Exception') {
  if (!evidence.exception || !evidence.exception.riskOwner || !evidence.exception.rationale || !evidence.exception.expiresAt || !evidence.exception.approvalReference) fail('Exception evidence requires riskOwner, rationale, expiresAt, and approvalReference');
  if (!Array.isArray(evidence.exception.compensatingControls) || evidence.exception.compensatingControls.length === 0) fail('Exception evidence requires compensatingControls');
}

console.log(`P1 DAST evidence is valid: ${evidencePath}`);
