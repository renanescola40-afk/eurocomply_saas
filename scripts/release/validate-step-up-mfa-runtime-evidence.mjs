export function validateStepUpMfaRuntimeEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = 7,
  } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  const generatedAt = Date.parse(String(evidence?.generatedAt ?? evidence?.reviewedAt ?? ''));

  if (evidence?.evidenceItem !== 'step-up-mfa-validation') {
    failures.push('evidenceItem must be step-up-mfa-validation');
  }

  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];

  if (!Number.isFinite(generatedAt)) {
    failures.push('generatedAt must be an ISO-8601 timestamp');
  } else {
    const ageMs = nowMs - generatedAt;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    if (ageMs < 0) failures.push('generatedAt must not be in the future');
    if (ageMs > maxAgeMs) failures.push(`generatedAt is older than ${maxAgeDays} days`);
  }

  if (evidence?.status === 'Exception') {
    const expiresAt = Date.parse(String(evidence?.exception?.expiresAt ?? ''));
    if (!Number.isFinite(expiresAt)) {
      failures.push('exception.expiresAt must be an ISO-8601 timestamp');
    } else if (expiresAt < nowMs) {
      failures.push('step-up MFA exception has expired');
    }
  }

  if (evidence?.status === 'Complete') {
    if (evidence?.outcome !== 'passed') {
      failures.push('Complete evidence outcome must be passed');
    }
    if (evidence?.runtimeValidation?.providerConfigured !== true) {
      failures.push('runtimeValidation.providerConfigured must be true');
    }
    if (evidence?.runtimeValidation?.providerProof?.present !== true) {
      failures.push('runtimeValidation.providerProof.present must be true');
    }
    if (evidence?.runtimeValidation?.failClosedWithoutProvider !== true) {
      failures.push('runtimeValidation.failClosedWithoutProvider must be true');
    }
    if (evidence?.runtimeValidation?.enterpriseReleaseBlockedWithoutProviderProof !== true) {
      failures.push('runtimeValidation.enterpriseReleaseBlockedWithoutProviderProof must be true');
    }
    if (evidence?.acceptanceCriteria?.releaseEnterpriseBlockedIfProviderProofAbsent !== true) {
      failures.push('acceptanceCriteria.releaseEnterpriseBlockedIfProviderProofAbsent must be true');
    }
    if (evidence?.positiveTests?.validSignedTokenAfterProviderPasses !== true) {
      failures.push('positiveTests.validSignedTokenAfterProviderPasses must be true');
    }

    const provenance = evidence?.verification_provenance;
    if (!provenance || typeof provenance !== 'object') {
      failures.push('Complete evidence requires verification_provenance');
    } else {
      if (!['github_actions', 'reviewed_runtime'].includes(provenance.method)) {
        failures.push('verification_provenance.method must be github_actions or reviewed_runtime');
      }
      if (!String(provenance.reference ?? '').trim()) {
        failures.push('verification_provenance.reference is required');
      }
      if (!/^[a-f0-9]{40}$/i.test(String(provenance.commitSha ?? ''))) {
        failures.push('verification_provenance.commitSha must be a full 40-character SHA');
      }
      if (!Number.isFinite(Date.parse(String(provenance.verifiedAt ?? '')))) {
        failures.push('verification_provenance.verifiedAt must be an ISO-8601 timestamp');
      }
    }
  }

  return failures;
}
