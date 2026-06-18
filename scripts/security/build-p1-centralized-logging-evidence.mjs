#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'centralized-logging-alerts.input.json');
const outputPath = process.argv[3] || path.join('docs', 'security', 'evidence', 'p1', 'centralized-logging-alerts.json');

const requiredRedaction = 'All confidential values are redacted.';
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredControls = [
  'Security logs are centralized',
  'Identity events are captured',
  'Alerting exists for high-risk security events',
  'Retention policy is documented',
  'Evidence is redacted',
];
const requiredCompleteSources = ['application', 'identity', 'database', 'edge'];

function fail(message) {
  console.error(`[p1-logging-builder] ${message}`);
  process.exit(1);
}

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${field} must be a non-empty string`);
  }
}

function hasControl(controls, expected) {
  return controls.some((control) => String(control).trim().toLowerCase() === expected.toLowerCase());
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

if (placeholderPattern.test(JSON.stringify(input))) {
  fail('input must not contain placeholder values');
}

if (!['Complete', 'Exception'].includes(input.status)) {
  fail('status must be Complete or Exception');
}

assertString(input.reviewedAt, 'reviewedAt');
assertString(input.reviewer, 'reviewer');
assertString(input.targetEnvironment, 'targetEnvironment');

if (!input.loggingBackend || typeof input.loggingBackend !== 'object') {
  fail('loggingBackend is required');
}
if (input.loggingBackend.scope !== 'centralized') {
  fail('loggingBackend.scope must be centralized');
}
for (const field of ['provider', 'retentionPolicy', 'evidenceLocation']) {
  assertString(input.loggingBackend[field], `loggingBackend.${field}`);
}

if (!Array.isArray(input.logSourcesReviewed) || input.logSourcesReviewed.length === 0) {
  fail('logSourcesReviewed must include at least one source');
}
const sources = new Set();
for (const [index, source] of input.logSourcesReviewed.entries()) {
  assertString(source.source, `logSourcesReviewed[${index}].source`);
  assertString(source.status, `logSourcesReviewed[${index}].status`);
  assertString(source.evidenceLocation, `logSourcesReviewed[${index}].evidenceLocation`);
  sources.add(String(source.source).trim().toLowerCase());
  if (input.status === 'Complete' && source.status !== 'connected') {
    fail(`${source.source} must have status connected for Complete evidence`);
  }
}

if (input.status === 'Complete') {
  for (const source of requiredCompleteSources) {
    if (!sources.has(source)) {
      fail(`Complete evidence must include centralized log source: ${source}`);
    }
  }
}

if (!Array.isArray(input.alertsReviewed) || input.alertsReviewed.length === 0) {
  fail('alertsReviewed must include at least one alert');
}
for (const [index, alert] of input.alertsReviewed.entries()) {
  for (const field of ['alertName', 'trigger', 'severity', 'status', 'evidenceLocation']) {
    assertString(alert[field], `alertsReviewed[${index}].${field}`);
  }
  if (input.status === 'Complete' && alert.status !== 'active') {
    fail(`${alert.alertName} must have status active for Complete evidence`);
  }
}

if (!Array.isArray(input.controlsVerified)) {
  fail('controlsVerified must be an array');
}
for (const control of requiredControls) {
  if (!hasControl(input.controlsVerified, control)) {
    fail(`controlsVerified must include: ${control}`);
  }
}

assertString(input.nextReviewDue, 'nextReviewDue');

const evidence = {
  control: 'centralized-logging-alerts',
  status: input.status,
  redaction: requiredRedaction,
  reviewedAt: input.reviewedAt,
  reviewer: input.reviewer,
  targetEnvironment: input.targetEnvironment,
  loggingBackend: input.loggingBackend,
  logSourcesReviewed: input.logSourcesReviewed,
  alertsReviewed: input.alertsReviewed,
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
console.log(`[p1-logging-builder] wrote ${outputPath}`);
