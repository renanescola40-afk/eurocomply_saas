#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const evidencePath = 'docs/security/evidence/runtime/external-security-review-or-pentest.json';
const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';
const placeholderValuePattern = /REPLACE_|YYYY-MM-DD|TODO|TBD|placeholder/i;

const requiredDocs = {
  'docs/security/PENTEST_SCOPE.md': [
    'auth',
    'RBAC',
    'tenant isolation',
    'APIs',
    'BOLA/IDOR',
    'uploads',
    'malware scanner',
    'billing Stripe',
    'webhooks',
    'audit chain',
    'exports',
    'GDPR delete',
    'rate limiting',
    'observability',
    'secrets',
  ],
  'docs/security/PRE_PENTEST_CHECKLIST.md': [
    'tenant A/B',
    'owner/admin/editor/viewer',
    'Stripe test mode',
    'Supabase test project',
    'upload scanner test mode',
    'seed data',
  ],
  'docs/security/PENTEST_FINDINGS_TRIAGE.md': [
    'Owner',
    'Severity',
    'Mitigation',
    'Due date',
    'critical/high',
    'formally accepted',
  ],
  'docs/security/PENTEST_RETEST_RECORD.md': [
    'Retest outcome',
    'Critical',
    'High',
    'retest evidence',
    'vendor retest',
  ],
};

const requiredScopeControls = [
  'auth',
  'RBAC',
  'tenant isolation',
  'APIs',
  'BOLA/IDOR',
  'uploads',
  'malware scanner',
  'billing Stripe',
  'webhooks',
  'audit chain',
  'exports',
  'GDPR delete',
  'rate limiting',
  'observability',
  'secrets',
];

const completeReviewFields = [
  'reviewer',
  'vendor',
  'date',
  'scope',
  'methodology',
  'summary',
  'criticalFindings',
  'highFindings',
  'mediumFindings',
  'resolutionStatus',
  'acceptedRiskRecords',
  'retestStatus',
  'reportStorageLocation',
];

const findingsSeverities = ['critical', 'high', 'medium', 'low', 'informational'];
const resolvedStatuses = ['resolved', 'formally_accepted', 'false_positive'];
const passingRetestStatuses = ['passed', 'not_required_formally_accepted', 'not_required_false_positive'];

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

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasPlaceholderString(value) {
  if (typeof value === 'string') return placeholderValuePattern.test(value);
  if (Array.isArray(value)) return value.some((entry) => hasPlaceholderString(entry));
  if (value && typeof value === 'object') return Object.values(value).some((entry) => hasPlaceholderString(entry));
  return false;
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replaceAll(' ', '_');
}

function requireNonEmptyString(object, field, prefix) {
  if (!isNonEmptyString(object?.[field])) failures.push(`${prefix}.${field} must be a non-empty string`);
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
  if (!row.includes('| Complete |')) failures.push(`${registerPath} must mark external review as Complete only after real evidence is attached`);
}

function validateCompleteShape(evidence) {
  for (const field of completeReviewFields) {
    if (!(field in evidence)) failures.push(`${evidencePath} missing Complete field: ${field}`);
  }

  for (const field of ['reviewer', 'vendor', 'date', 'methodology', 'summary', 'resolutionStatus', 'retestStatus', 'reportStorageLocation']) {
    requireNonEmptyString(evidence, field, evidencePath);
  }

  for (const field of ['scope', 'criticalFindings', 'highFindings', 'mediumFindings', 'acceptedRiskRecords']) {
    if (!Array.isArray(evidence[field])) failures.push(`${evidencePath}.${field} must be an array`);
  }

  if (!isNonEmptyArray(evidence.scope)) failures.push(`${evidencePath}.scope must list reviewed scope items`);
  if (!isNonEmptyString(evidence.reportStorageLocation)) failures.push(`${evidencePath}.reportStorageLocation is required`);
  if (hasPlaceholderString(evidence)) failures.push(`${evidencePath} Complete evidence must not contain placeholder strings such as REPLACE_, YYYY-MM-DD, TODO, TBD, or placeholder`);

  const normalizedScope = new Set((Array.isArray(evidence.scope) ? evidence.scope : []).map((item) => normalize(item)));
  for (const control of requiredScopeControls) {
    if (!normalizedScope.has(normalize(control))) failures.push(`${evidencePath}.scope missing ${control}`);
  }
}

function validateEvidenceIntegrity(evidence) {
  if (evidence.evidenceItem !== 'external-security-review-or-pentest') {
    failures.push(`${evidencePath} evidenceItem must be external-security-review-or-pentest`);
  }

  if (evidence.status !== 'Complete') failures.push(`${evidencePath} status must be Complete`);
  if (evidence.status === 'Complete' && evidence.outcome === 'not_started') failures.push(`${evidencePath} cannot be Complete with outcome not_started`);

  if (evidence.evidenceIntegrity?.containsSecrets !== false) failures.push(`${evidencePath} evidenceIntegrity.containsSecrets must be false`);
  if (evidence.evidenceIntegrity?.valuesRedacted !== true) failures.push(`${evidencePath} evidenceIntegrity.valuesRedacted must be true`);
  if (evidence.evidenceIntegrity?.placeholderOnly !== false) failures.push(`${evidencePath} evidenceIntegrity.placeholderOnly must be false`);
  if (evidence.evidenceIntegrity?.realExternalReportAttached !== true) failures.push(`${evidencePath} evidenceIntegrity.realExternalReportAttached must be true`);

  if (!isNonEmptyString(evidence.reportStorageLocation)) failures.push(`${evidencePath} report missing: reportStorageLocation must reference the real external report`);
  if (!isNonEmptyString(evidence.reportReference)) failures.push(`${evidencePath} report missing: reportReference must identify the real external report`);
}

function validateFindings(evidence) {
  const findings = Array.isArray(evidence.findings) ? evidence.findings : [];
  const summary = evidence.findingsSummary ?? {};

  for (const severity of findingsSeverities) {
    if (!Number.isInteger(summary[severity]) || summary[severity] < 0) {
      failures.push(`${evidencePath} findingsSummary.${severity} must be a non-negative integer`);
    }
  }

  for (const finding of findings) {
    const id = isNonEmptyString(finding?.id) ? finding.id : '<missing finding id>';
    const severity = normalize(finding?.severity);
    const status = normalize(finding?.status);
    const retestStatus = normalize(finding?.retestStatus);

    if (!findingsSeverities.includes(severity)) failures.push(`${evidencePath} finding ${id} has invalid severity`);

    for (const field of ['owner', 'dueDate', 'mitigation', 'retestStatus']) {
      if (!isNonEmptyString(finding?.[field])) failures.push(`${evidencePath} finding ${id} missing ${field}`);
    }

    if ((severity === 'critical' || severity === 'high') && !resolvedStatuses.includes(status)) {
      failures.push(`${evidencePath} ${severity} finding ${id} must be resolved, formally accepted, or false positive`);
    }

    if (severity === 'critical' && !passingRetestStatuses.includes(retestStatus)) {
      failures.push(`${evidencePath} critical finding ${id} has missing, pending, failed, or invalid retest`);
    }

    if (status === 'formally_accepted') {
      const acceptance = finding.riskAcceptance ?? {};
      for (const field of ['acceptedBy', 'acceptedAt', 'acceptedUntil', 'rationale', 'compensatingControls']) {
        if (field === 'compensatingControls') {
          if (!isNonEmptyArray(acceptance[field])) failures.push(`${evidencePath} finding ${id} formal acceptance missing ${field}`);
        } else if (!isNonEmptyString(acceptance[field])) {
          failures.push(`${evidencePath} finding ${id} formal acceptance missing ${field}`);
        }
      }
    }
  }

  const criticalUnresolved = findings.filter((finding) => normalize(finding.severity) === 'critical' && !resolvedStatuses.includes(normalize(finding.status)));
  const highUnresolved = findings.filter((finding) => normalize(finding.severity) === 'high' && !resolvedStatuses.includes(normalize(finding.status)));
  const criticalRetestMissing = findings.filter((finding) => normalize(finding.severity) === 'critical' && !passingRetestStatuses.includes(normalize(finding.retestStatus)));

  if (criticalUnresolved.length > 0) failures.push(`${evidencePath} critical unresolved findings: ${criticalUnresolved.map((finding) => finding.id).join(', ')}`);
  if (highUnresolved.length > 0) failures.push(`${evidencePath} high unresolved findings: ${highUnresolved.map((finding) => finding.id).join(', ')}`);
  if (criticalRetestMissing.length > 0) failures.push(`${evidencePath} critical retest missing: ${criticalRetestMissing.map((finding) => finding.id).join(', ')}`);

  if (Array.isArray(evidence.criticalFindings) && evidence.criticalFindings.length !== summary.critical) {
    failures.push(`${evidencePath}.criticalFindings count must match findingsSummary.critical`);
  }
  if (Array.isArray(evidence.highFindings) && evidence.highFindings.length !== summary.high) {
    failures.push(`${evidencePath}.highFindings count must match findingsSummary.high`);
  }
  if (Array.isArray(evidence.mediumFindings) && evidence.mediumFindings.length !== summary.medium) {
    failures.push(`${evidencePath}.mediumFindings count must match findingsSummary.medium`);
  }
}

validateRequiredDocs();
validateRegister();
const evidence = readJson(evidencePath);

if (evidence) {
  validateEvidenceIntegrity(evidence);
  if (evidence.status === 'Complete') validateCompleteShape(evidence);
  validateFindings(evidence);
}

if (failures.length > 0) {
  console.error('External security review gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('External security review gate passed. Real external review/pentest evidence is attached and blocking findings are resolved or accepted.');
