const DEFAULT_MAX_AGE_DAYS = 7;

function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateBranchProtectionFreshness(
  evidence,
  {
    now = new Date(),
    maxAgeDays = DEFAULT_MAX_AGE_DAYS,
    expectedRepository = 'renanescola40-afk/eurocomply_saas',
    expectedBranch = 'main',
  } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  const capturedAt = parseTimestamp(evidence?.captured_at);

  if (!Number.isFinite(nowMs)) {
    failures.push('validation clock must be a valid timestamp');
    return failures;
  }

  if (evidence?.repository !== expectedRepository) {
    failures.push(`repository must be ${expectedRepository}`);
  }

  if (evidence?.branch !== expectedBranch) {
    failures.push(`branch must be ${expectedBranch}`);
  }

  if (capturedAt === null) {
    failures.push('captured_at must be an ISO-8601 timestamp');
  } else {
    const ageMs = nowMs - capturedAt;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    if (ageMs < 0) {
      failures.push('captured_at must not be in the future');
    } else if (ageMs > maxAgeMs) {
      failures.push(`captured_at is older than ${maxAgeDays} days`);
    }
  }

  if (evidence?.status === 'Exception') {
    const expiresAt = parseTimestamp(evidence?.exception?.expiresAt);
    if (expiresAt === null) {
      failures.push('exception.expiresAt must be a valid timestamp');
    } else if (expiresAt < nowMs) {
      failures.push('branch protection exception has expired');
    }
  }

  if (evidence?.status === 'Complete') {
    const provenance = evidence?.verification_provenance;
    if (!provenance || typeof provenance !== 'object') {
      failures.push('Complete evidence requires verification_provenance');
    } else {
      if (!['github_api', 'screenshot'].includes(provenance.method)) {
        failures.push('verification_provenance.method must be github_api or screenshot');
      }
      if (!String(provenance.reference ?? '').trim()) {
        failures.push('verification_provenance.reference is required');
      }
      if (!parseTimestamp(provenance.verifiedAt)) {
        failures.push('verification_provenance.verifiedAt must be an ISO-8601 timestamp');
      }
    }
  }

  return failures;
}
