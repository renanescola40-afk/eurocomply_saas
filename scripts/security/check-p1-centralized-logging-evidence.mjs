#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'centralized-logging-alerts.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredControls = [
  'Security logs are centralized',
  'Identity events are captured',
  'Alerting exists for high-risk security events',
  'Retention policy is documented',
  'Evidence is redacted',
];
const requiredCompleteSources = ['application', 'identity', 'database', 'edge'];
const requiredActiveAlerts = ['audit_chain_invalid', 'rls_validation_failed', 'webhook_failed'];
const allowedAlertSeverities = new Set(['high', 'critical']);

function fail(message) {
  console.error(`P1 centralized logging evidence check failed: ${message}`);
  process.exit(1);
}

function hasControl(controls, expected) {
  return controls.some((control) => String(control).trim().toLowerCase() === expected.toLowerCase());
}

if (!fs.existsSync(evidencePath)) {
  console.log(`P1 centralized logging evidence is open: ${evidencePath} is not present yet.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
}

if (placeholderPattern.test(JSON.stringify(evidence))) fail('evidence must not contain placeholders');
if (evidence.control !== 'centralized-logging-alerts') fail('control must be centralized-logging-alerts');
if (!['Complete', 'Exception'].includes(evidence.status)) fail('status must be Complete or Exception');
if (evidence.redaction !== 'All confidential values are redacted.') fail('redaction statement is missing or invalid');
if (!evidence.reviewedAt || !evidence.reviewer || evidence.targetEnvironment !== 'production') fail('reviewedAt, reviewer, and production targetEnvironment are required');

if (!evidence.loggingBackend || evidence.loggingBackend.scope !== 'centralized' || !evidence.loggingBackend.provider || !evidence.loggingBackend.retentionPolicy || !evidence.loggingBackend.evidenceLocation) fail('loggingBackend must identify centralized provider, retentionPolicy, and evidenceLocation');
if (!evidence.loggingBackend.environmentTag || !evidence.loggingBackend.releaseTag) fail('loggingBackend must document environment and release correlation tags');

if (!Array.isArray(evidence.logSourcesReviewed) || evidence.logSourcesReviewed.length === 0) fail('logSourcesReviewed must include at least one source');
const sources = new Set();
for (const source of evidence.logSourcesReviewed) {
  if (!source.source || !source.status || !source.evidenceLocation) fail('each log source must include source, status, and evidenceLocation');
  sources.add(String(source.source).trim().toLowerCase());
  if (evidence.status === 'Complete' && source.status !== 'connected') fail(`${source.source} must have status connected for Complete evidence`);
}

if (evidence.status === 'Complete') {
  for (const source of requiredCompleteSources) {
    if (!sources.has(source)) fail(`Complete evidence must include centralized log source: ${source}`);
  }
}

if (!Array.isArray(evidence.alertsReviewed) || evidence.alertsReviewed.length === 0) fail('alertsReviewed must include at least one alert');
const activeAlerts = new Set();
for (const alert of evidence.alertsReviewed) {
  if (!alert.alertName || !alert.trigger || !alert.severity || !alert.status || !alert.evidenceLocation || !alert.fingerprint) fail('each alert must include alertName, trigger, severity, status, fingerprint, and evidenceLocation');
  if (!allowedAlertSeverities.has(alert.severity)) fail(`${alert.alertName} severity must be high or critical`);
  if (evidence.status === 'Complete' && alert.status !== 'active') fail(`${alert.alertName} must have status active for Complete evidence`);
  if (alert.status === 'active') activeAlerts.add(String(alert.alertName).trim());
}

if (evidence.status === 'Complete') {
  for (const alertName of requiredActiveAlerts) {
    if (!activeAlerts.has(alertName)) fail(`Complete evidence must include active alert: ${alertName}`);
  }
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

console.log(`P1 centralized logging evidence is valid: ${evidencePath}`);
