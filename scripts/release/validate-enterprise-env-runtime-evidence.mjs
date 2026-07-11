function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateEnterpriseEnvRuntimeEvidence(
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
  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];

  if (evidence?.evidenceItem !== 'enterprise-release-env-readiness') {
    failures.push('evidenceItem must be enterprise-release-env-readiness');
  }

  const generatedAt = parseTimestamp(evidence?.generatedAt ?? evidence?.reviewedAt);
  if (generatedAt === null) failures.push('generatedAt must be an ISO-8601 timestamp');
  else {
    const ageMs = nowMs - generatedAt;
    if (ageMs < 0) failures.push('generatedAt must not be in the future');
    if (ageMs > maxAgeDays * 24 * 60 * 60 * 1000) failures.push(`generatedAt is older than ${maxAgeDays} days`);
  }

  if (evidence?.status === 'Exception') {
    const expiresAt = parseTimestamp(evidence?.exception?.expiresAt);
    if (expiresAt === null) failures.push('exception.expiresAt must be an ISO-8601 timestamp');
    else if (expiresAt < nowMs) failures.push('enterprise env exception has expired');
  }

  if (evidence?.status !== 'Complete') return failures;

  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');
  if (evidence?.releaseTarget !== 'enterprise') failures.push('releaseTarget must be enterprise');
  if (evidence?.evidenceIntegrity?.placeholderOnly !== false) failures.push('evidenceIntegrity.placeholderOnly must be false');
  if (evidence?.noSecretsStored !== true) failures.push('noSecretsStored must be true');
  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) failures.push('evidenceIntegrity.containsSensitiveValues must be false');
  if (evidence?.evidenceIntegrity?.rawUrlsStored !== false) failures.push('evidenceIntegrity.rawUrlsStored must be false');
  if (evidence?.evidenceIntegrity?.authorizationHeaderStored !== false) failures.push('evidenceIntegrity.authorizationHeaderStored must be false');
  if (evidence?.evidenceIntegrity?.cookiesStored !== false) failures.push('evidenceIntegrity.cookiesStored must be false');

  const runtime = evidence?.runtimeContext ?? {};
  if (runtime.generatedByGithubActions !== true) failures.push('runtimeContext.generatedByGithubActions must be true');
  if (runtime.repository !== expectedRepository) failures.push(`runtimeContext.repository must be ${expectedRepository}`);
  if (runtime.branch !== expectedBranch) failures.push(`runtimeContext.branch must be ${expectedBranch}`);
  if (!String(runtime.githubRunId ?? '').trim()) failures.push('runtimeContext.githubRunId is required');
  const commitSha = String(runtime.commitSha ?? evidence?.commitSha ?? '');
  if (!/^[a-f0-9]{40}$/i.test(commitSha)) failures.push('runtime commit SHA must be a full commit SHA');
  if (expectedCommitSha && commitSha !== expectedCommitSha) failures.push(`runtime commit SHA must match ${expectedCommitSha}`);

  const checks = Array.isArray(evidence?.checks) ? evidence.checks : [];
  if (checks.length === 0) failures.push('checks must contain enterprise environment checks');
  for (const check of checks) {
    if (check?.required === true && check?.passed !== true) failures.push(`required check ${check?.name ?? '<unknown>'} must pass`);
  }

  if (!Array.isArray(evidence?.failures)) failures.push('failures must be an array');
  else if (evidence.failures.length > 0) failures.push('failures must be empty');
  if (!Array.isArray(evidence?.controlsVerified) || evidence.controlsVerified.length === 0) {
    failures.push('controlsVerified must not be empty');
  }

  return failures;
}
