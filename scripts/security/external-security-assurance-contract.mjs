import { execFileSync } from 'node:child_process';

export const EXTERNAL_SECURITY_ASSURANCE_SCHEMA = 'risck-comply.external-security-assurance.v2';

export const REQUIRED_EXTERNAL_SECURITY_SCOPE = Object.freeze([
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
]);

const SHA256_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i;
const PLACEHOLDER_PATTERN = /(?:REPLACE_|YYYY-MM-DD|TODO|TBD|placeholder|pending_real_external_report|__OPEN_|not_started|not-started|unknown|dummy|fake)/i;
const CLOSED_FINDING_STATUSES = new Set(['resolved', 'formally_accepted', 'false_positive']);
const PASSING_RETEST_STATUSES = new Set(['passed', 'not_required_formally_accepted', 'not_required_false_positive']);
const SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'informational']);
const ALLOWED_REDACTION_CONFIRMATIONS = new Set([
  'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.',
  'Redaction confirmed for runtime evidence.',
]);

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0 && !PLACEHOLDER_PATTERN.test(value.trim());
}

function containsPlaceholder(value) {
  if (typeof value === 'string') return PLACEHOLDER_PATTERN.test(value.trim());
  if (Array.isArray(value)) return value.some((item) => containsPlaceholder(item));
  if (value && typeof value === 'object') return Object.values(value).some((item) => containsPlaceholder(item));
  return false;
}

function validPastOrPresentDate(value, now) {
  if (!nonEmptyString(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date <= now;
}

function validOrderedWindow(start, end, now) {
  if (!nonEmptyString(start) || !nonEmptyString(end)) return false;
  const startsAt = new Date(start);
  const endsAt = new Date(end);
  return (
    !Number.isNaN(startsAt.getTime()) &&
    !Number.isNaN(endsAt.getTime()) &&
    startsAt <= endsAt &&
    endsAt <= now
  );
}

function requireStrings(document, keys, prefix, failures) {
  for (const key of keys) {
    if (!nonEmptyString(document?.[key])) failures.push(`${prefix}.${key}_missing_or_placeholder`);
  }
}

function validateRiskAcceptance(acceptance, findingId, now, failures) {
  if (!acceptance || typeof acceptance !== 'object' || Array.isArray(acceptance)) {
    failures.push(`finding:${findingId}:risk_acceptance_missing`);
    return;
  }

  requireStrings(
    acceptance,
    ['acceptedBy', 'acceptedAt', 'acceptedUntil', 'rationale', 'customerImpact'],
    `finding:${findingId}:riskAcceptance`,
    failures,
  );
  if (!Array.isArray(acceptance.compensatingControls) || acceptance.compensatingControls.length === 0) {
    failures.push(`finding:${findingId}:risk_acceptance_compensating_controls_missing`);
  }
  if (!validPastOrPresentDate(acceptance.acceptedAt, now)) {
    failures.push(`finding:${findingId}:risk_acceptance_date_invalid`);
  }
  const acceptedUntil = new Date(String(acceptance.acceptedUntil ?? ''));
  if (Number.isNaN(acceptedUntil.getTime()) || acceptedUntil <= now) {
    failures.push(`finding:${findingId}:risk_acceptance_expired_or_invalid`);
  }
}

function findRetest(evidence, findingId) {
  const retests = Array.isArray(evidence?.retests) ? evidence.retests : [];
  return retests.find((item) => item?.findingId === findingId || item?.id === findingId) ?? null;
}

function validateHighCriticalRetest(evidence, finding, now, failures) {
  const id = String(finding.id ?? '').trim() || '<missing-id>';
  const status = normalize(finding.status);
  const declaredRetest = normalize(finding.retestStatus);
  const retest = findRetest(evidence, finding.id);

  if (!PASSING_RETEST_STATUSES.has(declaredRetest)) {
    failures.push(`finding:${id}:high_critical_retest_not_closed`);
    return;
  }

  if (!retest || typeof retest !== 'object' || Array.isArray(retest)) {
    failures.push(`finding:${id}:retest_record_missing`);
    return;
  }

  const retestStatus = normalize(retest.retestStatus ?? retest.status ?? retest.outcome);
  if (retestStatus !== declaredRetest) failures.push(`finding:${id}:retest_status_mismatch`);
  requireStrings(retest, ['retestDate', 'retestedBy', 'evidenceReference'], `finding:${id}:retest`, failures);
  if (!validPastOrPresentDate(retest.retestDate, now)) failures.push(`finding:${id}:retest_date_invalid`);

  if (status === 'resolved' && retestStatus !== 'passed') {
    failures.push(`finding:${id}:resolved_high_critical_requires_passed_retest`);
  }
  if (status === 'formally_accepted' && retestStatus !== 'not_required_formally_accepted') {
    failures.push(`finding:${id}:formal_acceptance_retest_disposition_invalid`);
  }
  if (status === 'false_positive' && !['not_required_false_positive', 'passed'].includes(retestStatus)) {
    failures.push(`finding:${id}:false_positive_retest_disposition_invalid`);
  }
}

function validateCompleteEvidence(evidence, expectedSha, now, failures) {
  if (evidence.schema !== EXTERNAL_SECURITY_ASSURANCE_SCHEMA) failures.push('schema_invalid');
  if (!['passed', 'passed_with_formal_acceptance'].includes(normalize(evidence.outcome))) {
    failures.push('outcome_not_final_pass');
  }
  if (containsPlaceholder(evidence)) failures.push('complete_evidence_contains_placeholder');
  if (!ALLOWED_REDACTION_CONFIRMATIONS.has(String(evidence.redactionConfirmation ?? ''))) {
    failures.push('redaction_confirmation_invalid');
  }

  const assessor = evidence.assessor;
  if (!assessor || typeof assessor !== 'object' || Array.isArray(assessor)) {
    failures.push('assessor_missing');
  } else {
    requireStrings(
      assessor,
      [
        'providerLegalEntity',
        'testingDeliveryEntity',
        'qualificationBasis',
        'accreditationReference',
        'leadTester',
        'independenceDeclaration',
        'conflictAssessment',
      ],
      'assessor',
      failures,
    );
  }

  const authorization = evidence.authorization;
  if (!authorization || typeof authorization !== 'object' || Array.isArray(authorization)) {
    failures.push('authorization_missing');
  } else {
    requireStrings(
      authorization,
      ['rulesOfEngagementReference', 'ndaReference', 'authorizedBy', 'authorizedAt', 'testWindowStart', 'testWindowEnd'],
      'authorization',
      failures,
    );
    if (!validPastOrPresentDate(authorization.authorizedAt, now)) failures.push('authorization.authorizedAt_invalid');
    if (!validOrderedWindow(authorization.testWindowStart, authorization.testWindowEnd, now)) {
      failures.push('authorization.test_window_invalid');
    }
  }

  const binding = evidence.testBinding;
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    failures.push('test_binding_missing');
  } else {
    requireStrings(binding, ['productSha', 'deploymentId'], 'testBinding', failures);
    if (!expectedSha) failures.push('expected_release_sha_unavailable');
    else if (binding.productSha !== expectedSha) failures.push('tested_product_sha_mismatch');
    if (!Array.isArray(binding.environments) || binding.environments.length === 0 || !binding.environments.every(nonEmptyString)) {
      failures.push('testBinding.environments_invalid');
    }
    if (!Array.isArray(binding.hostnames) || binding.hostnames.length === 0 || !binding.hostnames.every(nonEmptyString)) {
      failures.push('testBinding.hostnames_invalid');
    }
  }

  const report = evidence.report;
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    failures.push('report_missing');
  } else {
    requireStrings(
      report,
      ['reportDate', 'reportReference', 'reportStorageLocation', 'reportDigest', 'methodology', 'executiveSummaryReference'],
      'report',
      failures,
    );
    if (!validPastOrPresentDate(report.reportDate, now)) failures.push('report.reportDate_invalid');
    if (!SHA256_PATTERN.test(String(report.reportDigest ?? ''))) failures.push('report.reportDigest_invalid');
  }

  const review = evidence.review;
  if (!review || typeof review !== 'object' || Array.isArray(review)) {
    failures.push('review_missing');
  } else {
    requireStrings(review, ['reviewType', 'provider', 'reportDate', 'reportReference', 'reviewedBy', 'reviewedAt'], 'review', failures);
    if (!validPastOrPresentDate(review.reviewedAt, now)) failures.push('review.reviewedAt_invalid');
  }

  if (evidence.evidenceIntegrity?.containsSecrets !== false) failures.push('evidence_integrity_contains_secrets_not_false');
  if (evidence.evidenceIntegrity?.valuesRedacted !== true) failures.push('evidence_integrity_values_redacted_not_true');
  if (evidence.evidenceIntegrity?.placeholderOnly !== false) failures.push('evidence_integrity_placeholder_only_not_false');
  if (evidence.evidenceIntegrity?.realExternalReportAttached !== true) failures.push('evidence_integrity_real_report_not_true');
  if (evidence.evidenceIntegrity?.noPentestClaimWithoutReport !== true) failures.push('evidence_integrity_no_claim_guard_missing');

  const scope = Array.isArray(evidence.scope) ? evidence.scope : [];
  const normalizedScope = new Set(scope.map((item) => normalize(item)));
  for (const control of REQUIRED_EXTERNAL_SECURITY_SCOPE) {
    if (!normalizedScope.has(normalize(control))) failures.push(`scope_missing:${control}`);
  }

  const findings = Array.isArray(evidence.findings) ? evidence.findings : [];
  const summary = evidence.findingsSummary;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    failures.push('findings_summary_missing');
  } else {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
    for (const finding of findings) {
      const severity = normalize(finding?.severity);
      if (SEVERITIES.has(severity)) counts[severity] += 1;
    }
    for (const severity of Object.keys(counts)) {
      if (!Number.isInteger(summary[severity]) || summary[severity] < 0) failures.push(`findingsSummary.${severity}_invalid`);
      else if (summary[severity] !== counts[severity]) failures.push(`findingsSummary.${severity}_count_mismatch`);
    }
  }

  const ids = new Set();
  for (const finding of findings) {
    const id = String(finding?.id ?? '').trim();
    const severity = normalize(finding?.severity);
    const status = normalize(finding?.status);
    if (!id) failures.push('finding_id_missing');
    else if (ids.has(id)) failures.push(`finding:${id}:duplicate_id`);
    else ids.add(id);
    if (!SEVERITIES.has(severity)) failures.push(`finding:${id || '<missing-id>'}:severity_invalid`);
    requireStrings(finding, ['owner', 'dueDate', 'mitigation', 'status', 'retestStatus', 'evidenceReference'], `finding:${id || '<missing-id>'}`, failures);

    if (severity === 'critical' || severity === 'high') {
      if (!CLOSED_FINDING_STATUSES.has(status)) failures.push(`finding:${id}:high_critical_not_closed`);
      if (status === 'formally_accepted') validateRiskAcceptance(finding.riskAcceptance, id, now, failures);
      validateHighCriticalRetest(evidence, finding, now, failures);
    }
  }
}

export function validateExternalSecurityAssurance(
  evidence,
  { enterprise = true, expectedSha = null, now = new Date() } = {},
) {
  const failures = [];
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return { accepted: false, failures: ['evidence_missing_or_invalid'] };
  }
  if (evidence.evidenceItem !== 'external-security-review-or-pentest') failures.push('evidence_item_invalid');
  if (!['Open', 'Complete', 'Exception'].includes(evidence.status)) failures.push('status_invalid');

  if (evidence.status === 'Open') {
    if (enterprise) failures.push('enterprise_requires_complete_external_assurance');
    if (!['not_started', 'not_run'].includes(normalize(evidence.outcome))) failures.push('open_outcome_invalid');
    if (evidence.evidenceIntegrity?.placeholderOnly !== true) failures.push('open_placeholder_only_not_true');
    if (evidence.evidenceIntegrity?.realExternalReportAttached !== false) failures.push('open_real_report_not_false');
  } else if (evidence.status === 'Exception') {
    if (enterprise) failures.push('enterprise_external_assurance_exception_forbidden');
    const exception = evidence.exception;
    if (!exception || typeof exception !== 'object' || Array.isArray(exception)) failures.push('exception_missing');
    else {
      requireStrings(exception, ['riskOwner', 'rationale', 'expiresAt', 'approvalReference'], 'exception', failures);
      if (!Array.isArray(exception.compensatingControls) || exception.compensatingControls.length === 0) {
        failures.push('exception_compensating_controls_missing');
      }
    }
  } else if (evidence.status === 'Complete') {
    validateCompleteEvidence(evidence, expectedSha, now, failures);
  }

  return {
    accepted: failures.length === 0 && evidence.status === 'Complete',
    failures: [...new Set(failures)].sort(),
  };
}

export function resolveExternalAssuranceExpectedSha(root = process.cwd()) {
  const explicit =
    process.env.EXTERNAL_ASSURANCE_EXPECTED_SHA?.trim() ||
    process.env.GITHUB_HEAD_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim();
  if (explicit) return explicit;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}
