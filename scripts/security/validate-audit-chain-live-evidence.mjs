export const requiredAuditChainChecks = [
  'migrationsApplied',
  'rpcExists',
  'appendNormal',
  'appendConcurrent',
  'missingPreviousHashDetected',
  'ephemeralFixtureCleanup',
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
    expectedRepository = 'renanescola40-afk/eurocomply_saas',
    expectedBranch = 'main',
    expectedCommitSha,
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

  if (evidence?.status !== 'Complete') return failures;

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
  if (evidence?.targetLiveValidation?.fixtureMode !== 'ephemeral') {
    failures.push('targetLiveValidation.fixtureMode must be ephemeral');
  }
  if (evidence?.targetLiveValidation?.ephemeralFixturesCreated !== true) {
    failures.push('targetLiveValidation.ephemeralFixturesCreated must be true');
  }
  if (evidence?.targetLiveValidation?.cleanup?.status !== 'Complete') {
    failures.push('targetLiveValidation.cleanup.status must be Complete');
  }
  if (evidence?.targetLiveValidation?.cleanup?.auditEventsRemoved !== true) {
    failures.push('targetLiveValidation.cleanup.auditEventsRemoved must be true');
  }
  if (evidence?.targetLiveValidation?.cleanup?.authFixturesRemoved !== true) {
    failures.push('targetLiveValidation.cleanup.authFixturesRemoved must be true');
  }

  const proof = evidence?.verification_provenance;
  if (!proof || typeof proof !== 'object') {
    failures.push('Complete evidence requires verification_provenance');
  } else {
    if (proof.method !== 'github_actions') {
      failures.push('verification_provenance.method must be github_actions');
    }
    if (!String(proof.reference ?? '').trim()) {
      failures.push('verification_provenance.reference is required');
    }
    if (!parseTimestamp(proof.verifiedAt)) {
      failures.push('verification_provenance.verifiedAt must be an ISO-8601 timestamp');
    }
    if (proof.repository !== expectedRepository) {
      failures.push(`verification_provenance.repository must be ${expectedRepository}`);
    }
    if (proof.branch !== expectedBranch) {
      failures.push(`verification_provenance.branch must be ${expectedBranch}`);
    }
    if (!String(proof.githubRunId ?? '').trim()) {
      failures.push('verification_provenance.githubRunId is required');
    }
    const commitSha = String(proof.commitSha ?? evidence?.commitSha ?? '');
    if (!/^[a-f0-9]{40}$/i.test(commitSha)) {
      failures.push('verification provenance commit SHA must be a full commit SHA');
    }
    if (expectedCommitSha && commitSha !== expectedCommitSha) {
      failures.push(`verification provenance commit SHA must match ${expectedCommitSha}`);
    }
  }

  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) {
    failures.push('evidenceIntegrity.containsSensitiveValues must be false');
  }
  if (evidence?.evidenceIntegrity?.credentialsStored !== false) {
    failures.push('evidenceIntegrity.credentialsStored must be false');
  }
  if (evidence?.evidenceIntegrity?.rawAuditPayloadsStored !== false) {
    failures.push('evidenceIntegrity.rawAuditPayloadsStored must be false');
  }
  if (evidence?.evidenceIntegrity?.rawIdentifiersStored !== false) {
    failures.push('evidenceIntegrity.rawIdentifiersStored must be false');
  }
  if (evidence?.evidenceIntegrity?.persistentFixtureCredentialsStored !== false) {
    failures.push('evidenceIntegrity.persistentFixtureCredentialsStored must be false');
  }
  if (evidence?.evidenceIntegrity?.syntheticAuditEventsRetained !== false) {
    failures.push('evidenceIntegrity.syntheticAuditEventsRetained must be false');
  }
  if (evidence?.evidenceIntegrity?.ephemeralFixtureCleanupVerified !== true) {
    failures.push('evidenceIntegrity.ephemeralFixtureCleanupVerified must be true');
  }

  return failures;
}
