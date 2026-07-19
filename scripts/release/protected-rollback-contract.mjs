const FULL_SHA = /^[a-f0-9]{40}$/;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalized(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function evaluateVercelDeploymentMetadata({
  metadata,
  expectedHostname,
  expectedProjectId,
  expectedOwnerId,
  expectedSha,
}) {
  const deployment = isRecord(metadata) ? metadata : null;
  const gitSource = isRecord(deployment?.gitSource) ? deployment.gitSource : null;
  const normalizedExpectedSha = normalized(expectedSha);
  const checks = [
    { name: 'metadataPresent', passed: Boolean(deployment) },
    { name: 'deploymentHostnameMatches', passed: normalized(deployment?.url) === normalized(expectedHostname) },
    { name: 'projectIdMatches', passed: String(deployment?.projectId ?? '') === expectedProjectId },
    { name: 'ownerIdMatches', passed: String(deployment?.ownerId ?? '') === expectedOwnerId },
    { name: 'deploymentReady', passed: deployment?.readyState === 'READY' },
    { name: 'deploymentTargetsProduction', passed: deployment?.target === 'production' },
    { name: 'gitSourceIsGitHub', passed: gitSource?.type === 'github' },
    {
      name: 'gitSourceShaMatches',
      passed: FULL_SHA.test(normalizedExpectedSha)
        && normalized(gitSource?.sha) === normalizedExpectedSha,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    failures: checks.filter((check) => !check.passed).map((check) => check.name),
  };
}
