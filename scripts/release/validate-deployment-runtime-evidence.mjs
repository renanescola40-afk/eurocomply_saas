function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function validateDeploymentRuntimeEvidence(
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

  if (evidence?.evidenceItem !== 'deployment-smoke-validation') {
    failures.push('evidenceItem must be deployment-smoke-validation');
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
    else if (expiresAt < nowMs) failures.push('deployment smoke exception has expired');
  }

  if (evidence?.status !== 'Complete') return failures;

  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');
  if (evidence?.evidenceIntegrity?.placeholderOnly !== false) failures.push('evidenceIntegrity.placeholderOnly must be false');
  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) failures.push('evidenceIntegrity.containsSensitiveValues must be false');
  if (evidence?.evidenceIntegrity?.customerFacingProof !== true) failures.push('evidenceIntegrity.customerFacingProof must be true');

  const runtime = evidence?.runtimeContext;
  if (runtime?.generatedByGithubActions !== true) failures.push('runtimeContext.generatedByGithubActions must be true');
  if (runtime?.repository !== expectedRepository) failures.push(`runtimeContext.repository must be ${expectedRepository}`);
  if (runtime?.branch !== expectedBranch) failures.push(`runtimeContext.branch must be ${expectedBranch}`);
  if (!/^[a-f0-9]{40}$/i.test(String(runtime?.commitSha ?? ''))) failures.push('runtimeContext.commitSha must be a full commit SHA');
  if (!String(runtime?.githubRunId ?? '').trim()) failures.push('runtimeContext.githubRunId is required');

  const targets = evidence?.targets;
  if (!Array.isArray(targets) || targets.length === 0) failures.push('targets must contain at least one deployed target');
  else {
    for (const target of targets) {
      if (target?.passed !== true) failures.push('every deployment target must pass');
      if (target?.checks?.healthOk !== true) failures.push('every target must prove /api/health');
      if (target?.checks?.readyProtected !== true) failures.push('every target must prove protected /api/ready');
      if (target?.checks?.readyOk !== true) failures.push('every target must prove successful /api/ready');
      if (target?.checks?.securityHeadersOk !== true) failures.push('every target must prove security headers');
      if (target?.checks?.sensitiveNoStoreOk !== true) failures.push('every target must prove no-store on sensitive responses');
    }
  }

  if (!Array.isArray(evidence?.smokeTargets?.passed) || evidence.smokeTargets.passed.length === 0) {
    failures.push('smokeTargets.passed must not be empty');
  }
  if (!Array.isArray(evidence?.smokeTargets?.failed)) failures.push('smokeTargets.failed must be an array');
  else if (evidence.smokeTargets.failed.length > 0) failures.push('smokeTargets.failed must be empty');

  return failures;
}
