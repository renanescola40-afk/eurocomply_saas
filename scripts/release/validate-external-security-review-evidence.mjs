const REQUIRED_SCOPE = [
  'auth','RBAC','tenant isolation','APIs','BOLA/IDOR','uploads','malware scanner',
  'billing Stripe','webhooks','audit chain','exports','GDPR delete','rate limiting',
  'observability','secrets',
];

function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isPlaceholder(value) {
  const text = String(value ?? '').trim();
  return !text || text.startsWith('__OPEN_UNTIL_');
}

function normalizeFinding(finding, severity) {
  return {
    ...finding,
    severity: finding?.severity ?? severity,
  };
}

export function validateExternalSecurityReviewEvidence(evidence, {
  now = new Date(),
  maxAgeDays = 180,
} = {}) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];

  if (evidence?.evidenceItem !== 'external-security-review-or-pentest') {
    failures.push('evidenceItem must be external-security-review-or-pentest');
  }

  if (evidence?.status === 'Exception') {
    const expiresAt = parseTimestamp(evidence?.exception?.expiresAt);
    if (expiresAt === null) failures.push('exception.expiresAt must be an ISO-8601 timestamp');
    else if (expiresAt < nowMs) failures.push('external security review exception has expired');
  }

  if (evidence?.status !== 'Complete') return failures;

  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');
  for (const field of ['vendor','date','reportReference','reportStorageLocation','methodology']) {
    if (isPlaceholder(evidence?.[field])) failures.push(`${field} must contain real reviewed evidence`);
  }

  const reportDate = parseTimestamp(evidence?.date ?? evidence?.review?.reportDate);
  if (reportDate === null) failures.push('date must be an ISO-8601 timestamp');
  else {
    const ageMs = nowMs - reportDate;
    if (ageMs < 0) failures.push('date must not be in the future');
    if (ageMs > maxAgeDays * 24 * 60 * 60 * 1000) failures.push(`external review is older than ${maxAgeDays} days`);
  }

  if (evidence?.evidenceIntegrity?.realExternalReportAttached !== true) failures.push('evidenceIntegrity.realExternalReportAttached must be true');
  if (evidence?.evidenceIntegrity?.placeholderOnly !== false) failures.push('evidenceIntegrity.placeholderOnly must be false');
  if (evidence?.evidenceIntegrity?.containsSecrets !== false) failures.push('evidenceIntegrity.containsSecrets must be false');
  if (evidence?.evidenceIntegrity?.valuesRedacted !== true) failures.push('evidenceIntegrity.valuesRedacted must be true');
  if (evidence?.evidenceIntegrity?.noPentestClaimWithoutReport !== true) failures.push('evidenceIntegrity.noPentestClaimWithoutReport must be true');

  for (const item of REQUIRED_SCOPE) {
    if (!evidence?.scope?.includes(item)) failures.push(`scope must include ${item}`);
  }

  const critical = Number(evidence?.findingsSummary?.critical ?? evidence?.criticalFindings?.length ?? 0);
  const high = Number(evidence?.findingsSummary?.high ?? evidence?.highFindings?.length ?? 0);
  const allFindings = [
    ...(evidence?.findings ?? []),
    ...(evidence?.criticalFindings ?? []).map((finding) => normalizeFinding(finding, 'critical')),
    ...(evidence?.highFindings ?? []).map((finding) => normalizeFinding(finding, 'high')),
  ];
  const unresolvedCriticalOrHigh = allFindings.filter((finding) =>
    ['critical','high'].includes(String(finding?.severity ?? '').toLowerCase()) &&
    !['resolved','accepted','formally accepted','false_positive','false positive'].includes(String(finding?.status ?? '').toLowerCase()),
  );
  if (unresolvedCriticalOrHigh.length > 0) failures.push('all critical and high findings must be resolved, accepted, or false positive');
  if ((critical > 0 || high > 0) && evidence?.resolutionStatus !== 'complete') failures.push('resolutionStatus must be complete when critical or high findings exist');

  const riskAcceptances = [
    ...(evidence?.riskAcceptances ?? []),
    ...(evidence?.acceptedRiskRecords ?? []).map((acceptance) => ({
      ...acceptance,
      approver: acceptance?.approver ?? acceptance?.acceptedBy,
      expiry: acceptance?.expiry ?? acceptance?.acceptedUntil,
    })),
  ];
  for (const acceptance of riskAcceptances) {
    for (const field of ['approver','rationale','expiry','customerImpact','compensatingControls']) {
      if (acceptance?.[field] == null || acceptance[field] === '' || (Array.isArray(acceptance[field]) && acceptance[field].length === 0)) {
        failures.push(`risk acceptance ${field} is required`);
      }
    }
    const expiry = parseTimestamp(acceptance?.expiry);
    if (expiry === null) failures.push('risk acceptance expiry must be an ISO-8601 timestamp');
    else if (expiry < nowMs) failures.push('risk acceptance has expired');
  }

  if (!String(evidence?.reportReference ?? '').trim()) failures.push('reportReference is required');
  return failures;
}
