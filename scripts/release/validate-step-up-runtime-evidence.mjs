function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateStepUpRuntimeEvidence(
  evidence,
  { now = new Date(), maxAgeDays = 7 } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));

  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];
  if (evidence?.evidenceItem !== 'step-up-mfa-validation') {
    failures.push('evidenceItem must be step-up-mfa-validation');
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

  if (evidence?.status !== 'Complete') return failures;

  if (evidence?.runtimeValidation?.providerConfigured !== true) {
    failures.push('runtimeValidation.providerConfigured must be true');
  }
  if (evidence?.runtimeValidation?.providerProof?.present !== true) {
    failures.push('runtimeValidation.providerProof.present must be true');
  }
  if (evidence?.runtimeValidation?.targetEnvironment !== true) {
    failures.push('runtimeValidation.targetEnvironment must be true');
  }
  if (evidence?.acceptanceCriteria?.releaseEnterpriseBlockedIfProviderProofAbsent !== true) {
    failures.push('acceptanceCriteria.releaseEnterpriseBlockedIfProviderProofAbsent must be true');
  }
  if (evidence?.evidenceIntegrity?.placeholderOnly !== false) {
    failures.push('evidenceIntegrity.placeholderOnly must be false');
  }
  if (evidence?.evidenceIntegrity?.realRuntimeEvidenceAttached !== true) {
    failures.push('evidenceIntegrity.realRuntimeEvidenceAttached must be true');
  }

  const provenance = evidence?.verificationProvenance;
  if (!provenance || typeof provenance !== 'object') {
    failures.push('Complete evidence requires verificationProvenance');
  } else {
    if (!['github_actions', 'reviewed_runtime'].includes(provenance.method)) {
      failures.push('verificationProvenance.method must be github_actions or reviewed_runtime');
    }
    if (!String(provenance.reference ?? '').trim()) {
      failures.push('verificationProvenance.reference is required');
    }
    if (!parseTimestamp(provenance.verifiedAt)) {
      failures.push('verificationProvenance.verifiedAt must be an ISO-8601 timestamp');
    }
    if (!/^[a-f0-9]{40}$/i.test(String(provenance.commitSha ?? ''))) {
      failures.push('verificationProvenance.commitSha must be a full commit SHA');
    }
  }

  return failures;
}
