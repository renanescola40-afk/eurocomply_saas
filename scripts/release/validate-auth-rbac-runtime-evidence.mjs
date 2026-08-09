export const requiredBlockingEvidence = [
  'runtimeValidation',
  'supabaseProjectSettings',
  'rlsValidation',
  'stepUpMfaProviderProof',
];

const FULL_SHA = /^[a-f0-9]{40}$/i;
const NUMERIC_ID = /^\d+$/;

function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function validateFreshness(evidence, { now, maxAgeDays }, failures) {
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  if (!Number.isFinite(nowMs)) {
    failures.push('validation clock must be a valid timestamp');
    return;
  }

  const generatedAt = parseTimestamp(evidence?.generatedAt ?? evidence?.reviewedAt);
  if (generatedAt === null) {
    failures.push('generatedAt must be an ISO-8601 timestamp');
    return;
  }

  const ageMs = nowMs - generatedAt;
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  if (ageMs < 0) failures.push('generatedAt must not be in the future');
  if (ageMs > maxAgeMs) failures.push(`generatedAt is older than ${maxAgeDays} days`);
}

function validateV2(
  evidence,
  {
    expectedRepository = 'renanescola40-afk/eurocomply_saas',
    expectedBranch = 'main',
    expectedCommitSha,
  },
  failures,
) {
  if (evidence?.status !== 'Complete') return;
  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');
  if (evidence?.repository !== expectedRepository) failures.push(`repository must be ${expectedRepository}`);
  if (evidence?.branch !== expectedBranch) failures.push(`branch must be ${expectedBranch}`);
  if (evidence?.environment !== 'production-auth-rbac-validation') {
    failures.push('environment must be production-auth-rbac-validation');
  }
  if (evidence?.productionGate !== 'eligible for downstream enterprise gates') {
    failures.push('productionGate must be eligible for downstream enterprise gates');
  }

  const targetSha = String(evidence?.targetSha ?? '').toLowerCase();
  const checkedOutSha = String(evidence?.checkedOutSha ?? '').toLowerCase();
  if (!FULL_SHA.test(targetSha)) failures.push('targetSha must be a full commit SHA');
  if (!FULL_SHA.test(checkedOutSha)) failures.push('checkedOutSha must be a full commit SHA');
  if (targetSha !== checkedOutSha) failures.push('targetSha and checkedOutSha must match');
  if (expectedCommitSha && targetSha !== String(expectedCommitSha).toLowerCase()) {
    failures.push('targetSha must match the assessed commit SHA');
  }

  const provenance = evidence?.provenance;
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
    failures.push('Complete v2 evidence requires provenance');
  } else {
    if (provenance.githubActions !== true) failures.push('provenance.githubActions must be true');
    if (provenance.repository !== expectedRepository) failures.push('provenance.repository is invalid');
    if (provenance.branch !== expectedBranch) failures.push('provenance.branch is invalid');
    if (!NUMERIC_ID.test(String(provenance.runId ?? ''))) failures.push('provenance.runId must be numeric');
    if (provenance.exactShaBound !== true) failures.push('provenance.exactShaBound must be true');
    if (String(provenance.expectedSha ?? '').toLowerCase() !== targetSha) failures.push('provenance.expectedSha must match targetSha');
    if (String(provenance.checkedOutSha ?? '').toLowerCase() !== checkedOutSha) failures.push('provenance.checkedOutSha must match checkedOutSha');
  }

  if (!evidence?.checks || typeof evidence.checks !== 'object' || Array.isArray(evidence.checks)) {
    failures.push('checks must be an object');
  } else if (Object.values(evidence.checks).some((value) => value !== true)) {
    failures.push('all Auth/RBAC runtime checks must pass');
  }

  if (!Array.isArray(evidence?.failures) || evidence.failures.length !== 0) {
    failures.push('Complete evidence cannot contain failures');
  }
  if (!Array.isArray(evidence?.controlsVerified) || evidence.controlsVerified.length < 5) {
    failures.push('controlsVerified must document the passed runtime controls');
  }

  const integrity = evidence?.evidenceIntegrity ?? {};
  if (integrity.placeholderOnly !== false) failures.push('evidenceIntegrity.placeholderOnly must be false');
  if (integrity.runtimeProofInvented !== false) failures.push('evidenceIntegrity.runtimeProofInvented must be false');
  if (integrity.rawCredentialsStored !== false) failures.push('evidenceIntegrity.rawCredentialsStored must be false');
  if (integrity.serviceRoleKeyStored !== false) failures.push('evidenceIntegrity.serviceRoleKeyStored must be false');
  if (integrity.disposablePasswordStored !== false) failures.push('evidenceIntegrity.disposablePasswordStored must be false');
  if (integrity.accessTokensStored !== false) failures.push('evidenceIntegrity.accessTokensStored must be false');
  if (integrity.userIdentifiersStored !== false) failures.push('evidenceIntegrity.userIdentifiersStored must be false');
  if (integrity.organizationIdentifiersStored !== false) failures.push('evidenceIntegrity.organizationIdentifiersStored must be false');
  if (integrity.rawProviderResponsesStored !== false) failures.push('evidenceIntegrity.rawProviderResponsesStored must be false');
  if (integrity.cleanupRequired !== true) failures.push('evidenceIntegrity.cleanupRequired must be true');
  if (integrity.cleanupVerified !== true) failures.push('evidenceIntegrity.cleanupVerified must be true');
}

function validateLegacy(evidence, failures) {
  if (evidence?.status !== 'Complete') return;

  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');
  if (evidence?.releaseDecision !== 'Go') failures.push('releaseDecision must be Go');
  if (evidence?.goNoGo?.status !== 'GO') failures.push('goNoGo.status must be GO');
  if (evidence?.runtimeEvidenceStatus !== 'executed_against_target_environment') {
    failures.push('runtimeEvidenceStatus must be executed_against_target_environment');
  }
  if (evidence?.primaryAuthStack !== 'supabase-auth') failures.push('primaryAuthStack must be supabase-auth');
  if (evidence?.evidenceIntegrity?.placeholderOnly !== false) failures.push('evidenceIntegrity.placeholderOnly must be false');
  if (evidence?.evidenceIntegrity?.realRuntimeEvidenceAttached !== true) failures.push('evidenceIntegrity.realRuntimeEvidenceAttached must be true');
  if (evidence?.evidenceIntegrity?.customerFacingProof !== true) failures.push('evidenceIntegrity.customerFacingProof must be true');

  for (const key of requiredBlockingEvidence) {
    if (!['complete', 'passed', true].includes(evidence?.blockingEvidence?.[key])) {
      failures.push(`blockingEvidence.${key} must be complete/passed`);
    }
  }

  const provenance = evidence?.verificationProvenance;
  if (!provenance || typeof provenance !== 'object') {
    failures.push('Complete evidence requires verificationProvenance');
  } else {
    if (!['github_actions', 'reviewed_runtime'].includes(provenance.method)) {
      failures.push('verificationProvenance.method must be github_actions or reviewed_runtime');
    }
    if (!String(provenance.reference ?? '').trim()) failures.push('verificationProvenance.reference is required');
    if (!parseTimestamp(provenance.verifiedAt)) failures.push('verificationProvenance.verifiedAt must be an ISO-8601 timestamp');
    if (!FULL_SHA.test(String(provenance.commitSha ?? ''))) {
      failures.push('verificationProvenance.commitSha must be a full commit SHA');
    }
  }
}

export function validateAuthRbacRuntimeEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = 7,
    expectedRepository = 'renanescola40-afk/eurocomply_saas',
    expectedBranch = 'main',
    expectedCommitSha,
  } = {},
) {
  const failures = [];
  if (evidence?.evidenceItem !== 'auth-rbac-final-validation') {
    failures.push('evidenceItem must be auth-rbac-final-validation');
  }

  validateFreshness(evidence, { now, maxAgeDays }, failures);

  if (evidence?.schema === 'risck-comply.auth-rbac-runtime-evidence.v2') {
    validateV2(evidence, { expectedRepository, expectedBranch, expectedCommitSha }, failures);
  } else {
    validateLegacy(evidence, failures);
  }

  return failures;
}
