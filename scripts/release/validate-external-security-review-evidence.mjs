import {
  resolveExternalAssuranceExpectedSha,
  validateExternalSecurityAssurance,
} from '../security/external-security-assurance-contract.mjs';

function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateExternalSecurityReviewEvidence(evidence, {
  now = new Date(),
  maxAgeDays = 180,
  expectedCommitSha = null,
} = {}) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];

  const expectedSha = expectedCommitSha || resolveExternalAssuranceExpectedSha(process.cwd());
  const canonical = validateExternalSecurityAssurance(evidence, {
    enterprise: true,
    expectedSha,
    now: now instanceof Date ? now : new Date(nowMs),
  });
  failures.push(...canonical.failures);

  if (evidence?.status === 'Complete') {
    const reportDate = parseTimestamp(evidence?.report?.reportDate ?? evidence?.review?.reportDate);
    if (reportDate === null) failures.push('report date must be an ISO-8601 timestamp');
    else {
      const ageMs = nowMs - reportDate;
      if (ageMs < 0) failures.push('report date must not be in the future');
      if (ageMs > maxAgeDays * 24 * 60 * 60 * 1000) {
        failures.push(`external review is older than ${maxAgeDays} days`);
      }
    }
  }

  return [...new Set(failures)].sort();
}
