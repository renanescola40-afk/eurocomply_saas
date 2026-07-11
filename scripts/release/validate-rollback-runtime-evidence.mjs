function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateRollbackRuntimeEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = 7,
    expectedRepository = 'renanescola40-afk/eurocomply_saas',
    expectedBranch = 'main',
  } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));

  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];
  if (evidence?.evidenceItem !== 'rollback-dry-run-validation') {
    failures.push('evidenceItem must be rollback-dry-run-validation');
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
    if (expiresAt === null) failures.push('exception.expiresAt must be an ISO-8601 timestamp');
    else if (expiresAt < nowMs) failures.push('rollback exception has expired');
  }

  if (evidence?.status !== 'Complete') return failures;

  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');
  if (!['production', 'enterprise'].includes(evidence?.releaseTarget)) {
    failures.push('releaseTarget must be production or enterprise');
  }
  if (evidence?.runtimeContext?.generatedByGithubActions !== true) {
    failures.push('runtimeContext.generatedByGithubActions must be true');
  }
  if (evidence?.runtimeContext?.repository !== expectedRepository) {
    failures.push(`runtimeContext.repository must be ${expectedRepository}`);
  }
  if (evidence?.runtimeContext?.branch !== expectedBranch) {
    failures.push(`runtimeContext.branch must be ${expectedBranch}`);
  }
  if (!String(evidence?.runtimeContext?.githubRunId ?? '').trim()) {
    failures.push('runtimeContext.githubRunId is required');
  }
  if (!/^[a-f0-9]{40}$/i.test(String(evidence?.runtimeContext?.commitSha ?? ''))) {
    failures.push('runtimeContext.commitSha must be a full commit SHA');
  }

  if (evidence?.dryRun?.mutatesProduction !== false) {
    failures.push('dryRun.mutatesProduction must be false');
  }
  if (evidence?.dryRun?.commandExecuted !== true) {
    failures.push('dryRun.commandExecuted must be true');
  }
  if (evidence?.targetValidation?.passed !== true) {
    failures.push('targetValidation.passed must be true');
  }
  if (evidence?.targetValidation?.targetConfigured !== true) {
    failures.push('targetValidation.targetConfigured must be true');
  }
  if (evidence?.targetValidation?.targetShaConfigured !== true) {
    failures.push('targetValidation.targetShaConfigured must be true');
  }
  if (evidence?.targetValidation?.targetDiffersFromCurrentRelease !== true) {
    failures.push('targetValidation.targetDiffersFromCurrentRelease must be true');
  }
  if (evidence?.targetValidation?.healthOk !== true) {
    failures.push('targetValidation.healthOk must be true');
  }
  if (evidence?.targetValidation?.healthNoStore !== true) {
    failures.push('targetValidation.healthNoStore must be true');
  }
  if (evidence?.targetValidation?.readyCheckRequired === true && evidence?.targetValidation?.readyOk !== true) {
    failures.push('targetValidation.readyOk must be true when readyCheckRequired=true');
  }
  if (evidence?.runbook?.present !== true) failures.push('runbook.present must be true');
  if (evidence?.functionalValidation?.recorded !== true) {
    failures.push('functionalValidation.recorded must be true');
  }

  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) {
    failures.push('evidenceIntegrity.containsSensitiveValues must be false');
  }
  if (evidence?.evidenceIntegrity?.authorizationHeaderStored !== false) {
    failures.push('evidenceIntegrity.authorizationHeaderStored must be false');
  }
  if (evidence?.evidenceIntegrity?.cookiesStored !== false) {
    failures.push('evidenceIntegrity.cookiesStored must be false');
  }
  if (evidence?.evidenceIntegrity?.rollbackTargetStored !== false) {
    failures.push('evidenceIntegrity.rollbackTargetStored must be false');
  }

  return failures;
}
