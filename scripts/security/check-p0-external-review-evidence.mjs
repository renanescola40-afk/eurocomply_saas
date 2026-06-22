#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'external-security-review-or-pentest.json');
const allowedRedactionTexts = new Set([
  'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
  'Redaction confirmed for runtime evidence.',
]);
const requiredControls = [
  'auth',
  'RBAC',
  'tenant isolation',
  'APIs',
  'uploads',
  'billing',
  'audit chain',
  'exports',
  'GDPR delete',
  'rate limiting',
  'webhooks',
];
const enterpriseTargets = new Set(['enterprise', 'enterprise-production', 'enterprise_release', 'enterprise-release']);
const releaseTarget = String(process.env.RELEASE_TARGET ?? '').toLowerCase();
const enterpriseRelease = process.argv.includes('--enterprise')
  || process.argv.includes('--enforce')
  || process.env.ENTERPRISE_RELEASE === 'true'
  || enterpriseTargets.has(releaseTarget)
  || process.env.npm_lifecycle_event === 'release:enterprise-readiness';

const failures = [];

function fail(message) {
  failures.push(message);
}

function finish() {
  if (failures.length === 0) {
    console.log('P0 external review evidence file is valid.');
    return;
  }

  console.error('P0 external review evidence check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function requireString(object, field, label = field) {
  if (!isNonEmptyString(object?.[field])) fail(`${label} must be a non-empty string`);
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replaceAll(' ', '_');
}

if (!fs.existsSync(evidencePath)) {
  if (enterpriseRelease) {
    fail(`${evidencePath} must exist before enterprise release`);
    finish();
  }

  console.log(`No ${evidencePath} file found yet; external review runtime evidence remains open.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
  finish();
}

if (evidence.evidenceItem !== 'external-security-review-or-pentest') {
  fail('evidenceItem must be external-security-review-or-pentest');
}

if (!['Open', 'Complete', 'Exception'].includes(evidence.status)) {
  fail('status must be Open, Complete, or Exception');
}

if (!allowedRedactionTexts.has(String(evidence.redactionConfirmation ?? ''))) {
  fail('redactionConfirmation must use an approved runtime-evidence redaction sentence');
}

if (evidence.evidenceIntegrity?.containsSecrets !== false) {
  fail('evidenceIntegrity.containsSecrets must be false');
}

if (evidence.evidenceIntegrity?.valuesRedacted !== true) {
  fail('evidenceIntegrity.valuesRedacted must be true');
}

if (evidence.status === 'Open') {
  if (enterpriseRelease) {
    fail('status must be Complete before enterprise release');
  }

  if (evidence.outcome !== 'not_started' && evidence.outcome !== 'not_run') {
    fail('Open evidence must have outcome not_started or not_run');
  }

  if (!String(evidence.releaseGate ?? '').toLowerCase().includes('blocked')) {
    fail('Open evidence must keep enterprise release blocked');
  }

  if (evidence.evidenceIntegrity?.placeholderOnly !== true) {
    fail('Open evidence must set evidenceIntegrity.placeholderOnly to true');
  }

  if (evidence.evidenceIntegrity?.realExternalReportAttached !== false) {
    fail('Open evidence must set evidenceIntegrity.realExternalReportAttached to false');
  }

  finish();
}

if (evidence.status === 'Exception') {
  if (enterpriseRelease) {
    fail('enterprise release cannot use an external-review Exception; a real Complete external review is required');
  }

  const exception = evidence.exception ?? {};
  requireString(exception, 'riskOwner', 'exception.riskOwner');
  requireString(exception, 'rationale', 'exception.rationale');
  const expiresAt = exception.expiresAt ?? exception.expiryDate;
  if (!isNonEmptyString(expiresAt)) fail('exception.expiresAt must be a non-empty string');
  requireString(exception, 'approvalReference', 'exception.approvalReference');
  if (!Array.isArray(exception.compensatingControls) || exception.compensatingControls.length === 0) {
    fail('exception.compensatingControls must include at least one item');
  }

  finish();
}

if (evidence.status === 'Complete') {
  if (evidence.outcome !== 'passed' && evidence.outcome !== 'passed_with_formal_acceptance') {
    fail('Complete evidence outcome must be passed or passed_with_formal_acceptance');
  }

  for (const field of ['reviewType', 'provider', 'reportDate', 'reportReference', 'reviewedBy', 'reviewedAt']) {
    requireString(evidence.review ?? {}, field, `review.${field}`);
  }

  if (evidence.evidenceIntegrity?.placeholderOnly !== false) {
    fail('Complete evidence must set evidenceIntegrity.placeholderOnly to false');
  }

  if (evidence.evidenceIntegrity?.realExternalReportAttached !== true) {
    fail('Complete evidence must set evidenceIntegrity.realExternalReportAttached to true');
  }

  if (!Array.isArray(evidence.evidenceLocations) || evidence.evidenceLocations.length === 0) {
    fail('evidenceLocations must include at least one durable redacted evidence reference');
  }

  const controlsVerified = Array.isArray(evidence.controlsVerified) ? evidence.controlsVerified : [];
  const normalizedControls = new Set(controlsVerified.map((control) => normalize(control)));
  for (const control of requiredControls) {
    if (!normalizedControls.has(normalize(control))) fail(`controlsVerified missing ${control}`);
  }

  const summary = evidence.findingsSummary ?? {};
  for (const severity of ['critical', 'high', 'medium', 'low', 'informational']) {
    if (!Number.isInteger(summary[severity]) || summary[severity] < 0) {
      fail(`findingsSummary.${severity} must be a non-negative integer`);
    }
  }

  const findings = Array.isArray(evidence.findings) ? evidence.findings : [];
  for (const finding of findings) {
    const id = isNonEmptyString(finding?.id) ? finding.id : '<missing finding id>';
    const severity = normalize(finding?.severity);
    const status = normalize(finding?.status);
    const retestStatus = normalize(finding?.retestStatus);

    if (!['critical', 'high', 'medium', 'low', 'informational'].includes(severity)) fail(`finding ${id} has invalid severity`);
    if (!isNonEmptyString(finding?.owner)) fail(`finding ${id} missing owner`);
    if (!isNonEmptyString(finding?.dueDate)) fail(`finding ${id} missing dueDate`);
    if (!isNonEmptyString(finding?.retestStatus)) fail(`finding ${id} missing retestStatus`);

    if (severity === 'critical' || severity === 'high') {
      const resolvedOrAccepted = status === 'resolved' || status === 'formally_accepted' || status === 'false_positive';
      if (!resolvedOrAccepted) fail(`${severity} finding ${id} must be resolved or formally accepted`);

      if (status === 'formally_accepted') {
        const acceptance = finding.riskAcceptance ?? {};
        for (const field of ['acceptedBy', 'acceptedAt', 'acceptedUntil', 'rationale']) {
          if (!isNonEmptyString(acceptance[field])) fail(`finding ${id} formal acceptance missing ${field}`);
        }
      }
    }

    if (severity === 'critical' && ['pending', 'required_pending', 'not_started', 'failed'].includes(retestStatus)) {
      fail(`critical finding ${id} has pending or failed retest`);
    }
  }
}

finish();
