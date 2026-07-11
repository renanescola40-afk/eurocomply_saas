export const requiredAuditChainChecks = [
  'migrationsApplied',
  'rpcExists',
  'appendNormal',
  'appendConcurrent',
  'missingPreviousHashDetected',
  'liveProofAttached',
];

function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateAuditChainLiveEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = 7,
  } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));

  if (!Number.isFinite(nowMs)) {
    return ['validation clock must be a valid timestamp'];
  }

  if (evidence?.evidenceItem !== 'audit-chain-live-validation') {
    failures.push('evidenceItem must be audit-chain-live-validation');
  }

  const generatedAt = parseTimestamp(evidence?.generatedAt ?? evidence?.reviewedAt);
  if (generatedAt === null) {
    failures.push('generatedAt must be an ISO-8601 timestamp');
  } else {
    const ageMs = nowMs - generatedAt;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    if (ageMs < 0) failures.push('generatedAt must not be in the future');
    if (ageMs > maxAgeMs) failures.push(`generatedAt is older than ${maxAgeDays} days`);
  }

  if (evidence?.status === 'Exception') {
    const expiresAt = parseTimestamp(evidence?.exception?.expiresAt);
    if (expiresAt === null) {
      failures.push('exception.expiresAt must be an ISO-8601 timestamp');
    } else if (expiresAt < nowMs) {
      failures.push('audit-chain exception has expired');
    }
  }

  if (evidence?.status === 'Complete') {
    if (evidence?.outcome !== 'passed') {
      failures.push('Complete evidence outcome must be passed');
    }

    for (const check of requiredAuditChainChecks) {
      if (evidence?.acceptanceCriteria?.[check] !== true) {
        failures.push(`acceptanceCriteria.${check} must be true`);
      }
    }

    if (evidence?.targetLiveValidation?.status !== 'Complete') {
      failures.push('targetLiveValidation.status must be Complete');
    }

    const proof = evidence?.verification_provenance;
    if (!proof || typeof proof !== 'object') {
      failures.push('Complete evidence requires verification_provenance');
    } else {
      if (!['github_actions', 'reviewed_runtime'].includes(proof.method)) {
        failures.push('verification_provenance.method must be github_actions or reviewed_runtime');
      }
      if (!String(proof.reference ?? '').trim()) {
        failures.push('verification_provenance.reference is required');
      }
      if (!parseTimestamp(proof.verifiedAt)) {
        failures.push('verification_provenance.verifiedAt must be an ISO-8601 timestamp');
      }
    }
  }

  return failures;
}
