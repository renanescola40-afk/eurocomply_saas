#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const evidencePath = 'docs/security/evidence/runtime/external-security-review-or-pentest.json';
const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';
const placeholderValuePattern = /REPLACE_|YYYY-MM-DD|TODO|placeholder/i;

const requiredDocs = {
  'docs/security/PENTEST_SCOPE.md': [
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
    'Stripe test mode',
    'Supabase test project',
  ],
  'docs/security/PRE_PENTEST_CHECKLIST.md': [
    'seed data tenant A/B',
    'accounts by role',
    'Stripe test mode',
    'Supabase test project',
    'scanner mock/real',
  ],
  'docs/security/PENTEST_FINDINGS_TRIAGE.md': [
    'Owner',
    'Severity',
    'Due date',
    'Retest',
    'critical/high',
    'formally accepted',
  ],
  'docs/security/PENTEST_RETEST_RECORD.md': [
    'Retest outcome',
    'Critical',
    'High',
    'retest evidence',
  ],
};

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
const lifecycleEvent = process.env.npm_lifecycle_event ?? '';
const releaseTarget = String(process.env.RELEASE_TARGET ?? '').toLowerCase();
const enterpriseRelease = process.argv.includes('--enterprise')
  || process.argv.includes('--enforce')
  || process.env.ENTERPRISE_RELEASE === 'true'
  || enterpriseTargets.has(releaseTarget)
  || lifecycleEvent === 'release:enterprise-readiness';

const failures = [];

function readText(filePath) {
  if (!existsSync(filePath)) {
    failures.push(`${filePath} is missing`);
    return '';
  }

  return readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  const content = readText(filePath);
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch (error) {
    failures.push(`${filePath} is invalid JSON: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

function requireTokens(filePath, content, tokens) {
  for (const token of tokens) {
    if (!content.includes(token)) failures.push(`${filePath} missing required token: ${token}`);
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasPlaceholderString(value) {
  if (typeof value === 'string') return placeholderValuePattern.test(value);
  if (Array.isArray(value)) return value.some((entry) => hasPlaceholderString(entry));
  if (value && typeof value === 'object') return Object.values(value).some((entry) => hasPlaceholderString(entry));
  return false;
}

function requireNonEmptyString(filePath, object, field, label = field) {
  if (!isNonEmptyString(object?.[field])) failures.push(`${filePath} ${label} must be a non-empty string`);
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replaceAll(' ', '_');
}

function validateRequiredDocs() {
  for (const [filePath, tokens] of Object.entries(requiredDocs)) {
    const content = readText(filePath);
    if (content) requireTokens(filePath, content, tokens);
  }
}

function validateRegister() {
  const register = readText(registerPath);
  if (!register) return;

  const row = register
    .split('\n')
    .find((line) => line.startsWith('| External security review or pentest completed |'));

  if (!row) {
    failures.push(`${registerPath} missing External security review or pentest row`);
    return;
  }

  if (!row.includes(evidencePath)) failures.push(`${registerPath} external review row must reference ${evidencePath}`);

  if (enterpriseRelease && !row.includes('| Complete |')) {
    failures.push(`${registerPath} must mark external review as Complete before enterprise release`);
  }
}

function validatePlaceholderSafety(evidence) {
  if (!evidence) return;

  if (evidence.evidenceItem !== 'external-security-review-or-pentest') {
    failures.push(`${evidencePath} evidenceItem must be external-security-review-or-pentest`);
  }

  if (evidence.status === 'Complete' && hasPlaceholderString(evidence)) {
    failures.push(`${evidencePath} Complete evidence must not contain placeholder strings such as REPLACE_, YYYY-MM-DD, TODO, or placeholder`);
  }

  if (evidence.status === 'Complete' && evidence.evidenceIntegrity?.placeholderOnly === true) {
    failures.push(`${evidencePath} cannot be Complete while evidenceIntegrity.placeholderOnly is true`);
  }

  if (evidence.status === 'Complete' && evidence.outcome === 'not_started') {
    failures.push(`${evidencePath} cannot be Complete with outcome not_started`);
  }

  if (evidence.evidenceIntegrity?.containsSecrets !== false) {
    failures.push(`${evidencePath} evidenceIntegrity.containsSecrets must be false`);
  }

  if (evidence.evidenceIntegrity?.valuesRedacted !== true) {
    failures.push(`${evidencePath} evidenceIntegrity.valuesRedacted must be true`);
  }
}

function requireRealReviewEvidence(evidence) {
  if (!evidence) return;

  if (evidence.status !== 'Complete') failures.push(`${evidencePath} status must be Complete before enterprise release`);
  if (evidence.outcome !== 'passed' && evidence.outcome !== 'passed_with_formal_acceptance') {
    failures.push(`${evidencePath} outcome must be passed or passed_with_formal_acceptance before enterprise release`);
  }

  for (const field of ['reviewType', 'provider', 'reportDate', 'reportReference', 'reviewedBy', 'reviewedAt']) {
    requireNonEmptyString(evidencePath, evidence.review ?? {}, field, `review.${field}`);
  }

  if (evidence.evidenceIntegrity?.placeholderOnly !== false) {
    failures.push(`${evidencePath} evidenceIntegrity.placeholderOnly must be false for enterprise release`);
  }

  if (evidence.evidenceIntegrity?.realExternalReportAttached !== true) {
    failures.push(`${evidencePath} evidenceIntegrity.realExternalReportAttached must be true for enterprise release`);
  }

  const controlsVerified = Array.isArray(evidence.controlsVerified) ? evidence.controlsVerified : [];
  const normalizedControls = new Set(controlsVerified.map((control) => normalize(control)));
  for (const control of requiredControls) {
    if (!normalizedControls.has(normalize(control))) failures.push(`${evidencePath} controlsVerified missing ${control}`);
  }
}

function validateFindings(evidence) {
  if (!evidence) return;

  const findings = Array.isArray(evidence.findings) ? evidence.findings : [];
  const summary = evidence.findingsSummary ?? {};

  if (evidence.status === 'Complete') {
    for (const severity of ['critical', 'high', 'medium', 'low', 'informational']) {
      if (!Number.isInteger(summary[severity]) || summary[severity] < 0) {
        failures.push(`${evidencePath} findingsSummary.${severity} must be a non-negative integer when Complete`);
      }
    }
  }

  for (const finding of findings) {
    const id = isNonEmptyString(finding?.id) ? finding.id : '<missing finding id>';
    const severity = normalize(finding?.severity);
    const status = normalize(finding?.status);
    const retestStatus = normalize(finding?.retestStatus);

    if (!['critical', 'high', 'medium', 'low', 'informational'].includes(severity)) {
      failures.push(`${evidencePath} finding ${id} has invalid severity`);
    }

    if (!isNonEmptyString(finding?.owner)) failures.push(`${evidencePath} finding ${id} missing owner`);
    if (!isNonEmptyString(finding?.dueDate)) failures.push(`${evidencePath} finding ${id} missing dueDate`);
    if (!isNonEmptyString(finding?.retestStatus)) failures.push(`${evidencePath} finding ${id} missing retestStatus`);

    if (severity === 'critical' || severity === 'high') {
      const resolvedOrAccepted = status === 'resolved' || status === 'formally_accepted' || status === 'false_positive';
      if (enterpriseRelease && !resolvedOrAccepted) {
        failures.push(`${evidencePath} ${severity} finding ${id} must be resolved or formally accepted before enterprise release`);
      }

      if (status === 'formally_accepted') {
        const acceptance = finding.riskAcceptance ?? {};
        for (const field of ['acceptedBy', 'acceptedAt', 'acceptedUntil', 'rationale']) {
          if (!isNonEmptyString(acceptance[field])) failures.push(`${evidencePath} finding ${id} formal acceptance missing ${field}`);
        }
      }
    }

    if (enterpriseRelease && severity === 'critical' && ['pending', 'required_pending', 'not_started', 'failed', 'missing'].includes(retestStatus)) {
      failures.push(`${evidencePath} critical finding ${id} has pending, failed, or missing retest`);
    }
  }
}

validateRequiredDocs();
validateRegister();
const evidence = readJson(evidencePath);
validatePlaceholderSafety(evidence);
validateFindings(evidence);
if (enterpriseRelease) requireRealReviewEvidence(evidence);

if (failures.length > 0) {
  console.error('External security review gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(enterpriseRelease
  ? 'External security review gate passed for enterprise release.'
  : 'External security review gate checked; enterprise enforcement not requested.');
