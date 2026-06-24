#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const evidencePath = 'docs/security/evidence/runtime/external-security-review-or-pentest.json';
const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';

const placeholderValuePattern =
  /REPLACE_|YYYY-MM-DD|TODO|TBD|placeholder|pending_real_external_report|PENDING_REAL_EXTERNAL_REPORT|__OPEN_|not_started|not-started/i;

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
  return String(value ?? '').trim().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_');
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

function registerStatus(row) {
  const cells = row.split('|').map((cell) => cell.trim()).filter(Boolean);
  return cells[1] ?? '';
}

function validateRegister(evidence) {
  const register = readText(registerPath);
  if (!register) return;

  const row = register
    .split('\n')
    .find((line) => line.startsWith('| External security review or pentest completed |'));

  if (!row) {
    failures.push(`${registerPath} missing External security review or pentest row`);
    return;
  }

  const p0Status = registerStatus(row);

  if (!row.includes(evidencePath)) failures.push(`${registerPath} external review row must reference ${evidencePath}`);

  if (evidence?.status === 'Complete' && p0Status !== 'Complete') {
    failures.push(`${registerPath} external review row must be Complete when the real external review evidence is Complete`);
  }

  if (evidence?.status !== 'Complete' && p0Status === 'Complete') {
    failures.push(`${registerPath} cannot mark external review Complete while ${evidencePath} is not Complete`);
  }
}

function validateCompleteShape(evidence) {
  for (const field of completeReviewFields) {
    if (!(field in evidence)) failures.push(`${evidencePath} missing Complete field: ${field}`);
  }

  for (const field of ['reviewer', 'vendor', 'date', 'methodology', 'summary', 'resolutionStatus', 'retestStatus', 'reportStorageLocation']) {
    requireNonEmptyString(evidence, field, evidencePath);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(evidence.date ?? ''))) {
    failures.push(`${evidencePath}.date must be YYYY-MM-DD from the real external report or approved review`);
  }

  for (const field of ['scope', 'criticalFindings', 'highFindings', 'mediumFindings', 'acceptedRiskRecords']) {
    if (!Array.isArray(evidence[field])) failures.push(`${evidencePath}.${field} must be an array`);
  }

  if (!isNonEmptyArray(evidence.scope)) failures.push(`${evidencePath}.scope must list reviewed scope items`);
  if (!isNonEmptyString(evidence.reportStorageLocation)) failures.push(`${evidencePath}.reportStorageLocation is required`);
  if (hasPlaceholderString(evidence)) {
    failures.push(`${evidencePath} Complete evidence must not contain placeholder strings such as REPLACE_, YYYY-MM-DD, TODO, TBD, pending_real_external_report, not_started, or placeholder`);
  }

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
  if (evidence.status === 'Complete' && normalize(evidence.outcome) === 'not_started') {
    failures.push(`${evidencePath} cannot be Complete with outcome not_started`);
  }

  if (evidence.evidenceIntegrity?.containsSecrets !== false) failures.push(`${evidencePath} evidenceIntegrity.containsSecrets must be false`);
  if (evidence.evidenceIntegrity?.valuesRedacted !== true) failures.push(`${evidencePath} evidenceIntegrity.valuesRedacted must be true`);
  if (evidence.evidenceIntegrity?.placeholderOnly !== false) failures.push(`${evidencePath} evidenceIntegrity.placeholderOnly must be false`);
  if (evidence.evidenceIntegrity?.realExternalReportAttached !== true) failures.push(`${evidencePath} evidenceIntegrity.realExternalReportAttached must be true`);

  if (!isNonEmptyString(evidence.reportStorageLocation) || hasPlaceholderString(evidence.reportStorageLocation)) {
    failures.push(`${evidencePath} report missing: reportStorageLocation must reference the real external report`);
  }

  if (!isNonEmptyString(evidence.reportReference) || hasPlaceholderString(evidence.reportReference)) {
    failures.push(`${evidencePath} report missing: reportReference must identify the real external report`);
  }
}

function findingKey(finding, fallback) {
  const id = isNonEmptyString(finding?.id) ? finding.id : fallback;
  return `${normalize(finding?.severity)}:${id}`;
}

function collectFindings(evidence) {
  const findings = [];
  const seen = new Set();

  for (const [field, expectedSeverity] of [
    ['findings', null],
    ['criticalFindings', 'critical'],
    ['highFindings', 'high'],
    ['mediumFindings', 'medium'],
  ]) {
    if (!Array.isArray(evidence[field])) continue;

    evidence[field].forEach((finding, index) => {
      const normalizedFinding =
        finding && typeof finding === 'object'
          ? { ...finding }
          : { id: `${field}[${index}]`, title: String(finding ?? '') };

      if (expectedSeverity && !normalizedFinding.severity) normalizedFinding.severity = expectedSeverity;

      const key = findingKey(normalizedFinding, `${field}[${index}]`);
      if (!seen.has(key)) {
        seen.add(key);
        findings.push(normalizedFinding);
      }
    });
  }

  return findings;
}

function riskAcceptanceForFinding(evidence, finding) {
  if (finding?.riskAcceptance && typeof finding.riskAcceptance === 'object') return finding.riskAcceptance;

  const findingId = finding?.id;
  if (!isNonEmptyString(findingId) || !Array.isArray(evidence.acceptedRiskRecords)) return null;

  return evidence.acceptedRiskRecords.find((record) => record?.findingId === findingId || record?.id === findingId) ?? null;
}

function retestEvidenceForFinding(evidence, finding) {
  if (isNonEmptyString(finding?.retestEvidence) || isNonEmptyString(finding?.retestReference)) return true;

  const findingId = finding?.id;
  if (!isNonEmptyString(findingId) || !Array.isArray(evidence.retests)) return false;

  return evidence.retests.some((retest) => {
    if (retest?.findingId !== findingId && retest?.id !== findingId) return false;
    if (!passingRetestStatuses.includes(normalize(retest?.retestStatus ?? retest?.status ?? retest?.outcome))) return false;
    return isNonEmptyString(retest?.evidence) || isNonEmptyString(retest?.retestEvidence) || isNonEmptyString(retest?.reportReference);
  });
}

function validateRiskAcceptances(evidence) {
  if (!Array.isArray(evidence.acceptedRiskRecords)) return;

  evidence.acceptedRiskRecords.forEach((record, index) => {
    const id = isNonEmptyString(record?.findingId) ? record.findingId : `acceptedRiskRecords[${index}]`;
    for (const field of ['acceptedBy', 'acceptedAt', 'acceptedUntil', 'rationale', 'customerImpact']) {
      if (!isNonEmptyString(record?.[field])) failures.push(`${evidencePath} accepted risk ${id} missing ${field}`);
    }

    if (!isNonEmptyArray(record?.compensatingControls)) {
      failures.push(`${evidencePath} accepted risk ${id} missing compensatingControls`);
    }
  });
}

function validateFindings(evidence) {
  const findings = collectFindings(evidence);
  const summary = evidence.findingsSummary ?? {};

  for (const severity of findingsSeverities) {
    if (!Number.isInteger(summary[severity]) || summary[severity] < 0) {
      failures.push(`${evidencePath} findingsSummary.${severity} must be a non-negative integer`);
    }
  }

  validateRiskAcceptances(evidence);

  for (const finding of findings) {
    const id = isNonEmptyString(finding?.id) ? finding.id : '<missing finding id>';
    const severity = normalize(finding?.severity);
    const status = normalize(finding?.status);
    const retestStatus = normalize(finding?.retestStatus);

    if (!findingsSeverities.includes(severity)) failures.push(`${evidencePath} finding ${id} has invalid severity`);

    for (const field of ['owner', 'dueDate', 'mitigation', 'status', 'retestStatus']) {
      if (!isNonEmptyString(finding?.[field])) failures.push(`${evidencePath} finding ${id} missing ${field}`);
    }

    if ((severity === 'critical' || severity === 'high') && !resolvedStatuses.includes(status)) {
      failures.push(`${evidencePath} ${severity} finding ${id} must be resolved, formally accepted, or false positive`);
    }

    if (severity === 'critical' && !passingRetestStatuses.includes(retestStatus)) {
      failures.push(`${evidencePath} critical finding ${id} has missing, pending, failed, or invalid retest`);
    }

    if (severity === 'critical' && retestStatus === 'passed' && !retestEvidenceForFinding(evidence, finding)) {
      failures.push(`${evidencePath} critical finding ${id} has passed retest status but no retest evidence/reference`);
    }

    if (status === 'formally_accepted') {
      const acceptance = riskAcceptanceForFinding(evidence, finding);
      if (!acceptance) {
        failures.push(`${evidencePath} finding ${id} is formally accepted but has no risk acceptance record`);
      } else {
        for (const field of ['acceptedBy', 'acceptedAt', 'acceptedUntil', 'rationale', 'customerImpact']) {
          if (!isNonEmptyString(acceptance[field])) failures.push(`${evidencePath} finding ${id} formal acceptance missing ${field}`);
        }

        if (!isNonEmptyArray(acceptance.compensatingControls)) {
          failures.push(`${evidencePath} finding ${id} formal acceptance missing compensatingControls`);
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

  if (Array.isArray(evidence.findings)) {
    const actualCounts = Object.fromEntries(findingsSeverities.map((severity) => [severity, 0]));
    for (const finding of findings) {
      const severity = normalize(finding?.severity);
      if (severity in actualCounts) actualCounts[severity] += 1;
    }

    for (const severity of ['critical', 'high', 'medium']) {
      if (Number.isInteger(summary[severity]) && actualCounts[severity] !== summary[severity]) {
        failures.push(`${evidencePath} ${severity} finding count must match findingsSummary.${severity}`);
      }
    }
  }
}

validateRequiredDocs();
const evidence = readJson(evidencePath);
validateRegister(evidence);

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
