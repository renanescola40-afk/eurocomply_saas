const FULL_GIT_SHA_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;

export function normalizeReleaseSha(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return FULL_GIT_SHA_PATTERN.test(normalized) ? normalized : null;
}

export function evaluateRuntimeReleaseSha({
  expectedCommitSha,
  expectedBuildSha,
  observedCommitSha,
  endpointStatus,
  cacheControl,
}) {
  const expectedCommit = normalizeReleaseSha(expectedCommitSha);
  const expectedBuild = normalizeReleaseSha(expectedBuildSha);
  const observedCommit = normalizeReleaseSha(observedCommitSha);
  const checks = [
    {
      name: 'expectedCommitShaValid',
      passed: Boolean(expectedCommit),
    },
    {
      name: 'expectedBuildShaValid',
      passed: Boolean(expectedBuild),
    },
    {
      name: 'expectedCommitAndBuildShaMatch',
      passed: Boolean(expectedCommit && expectedBuild && expectedCommit === expectedBuild),
    },
    {
      name: 'runtimeReleaseMetadataEndpointOk',
      passed: endpointStatus === 200,
    },
    {
      name: 'runtimeReleaseMetadataNoStore',
      passed: /\bno-store\b/i.test(String(cacheControl || '')),
    },
    {
      name: 'observedRuntimeCommitShaValid',
      passed: Boolean(observedCommit),
    },
    {
      name: 'observedRuntimeCommitMatchesExpected',
      passed: Boolean(expectedCommit && observedCommit && expectedCommit === observedCommit),
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    expectedCommitSha: expectedCommit,
    expectedBuildSha: expectedBuild,
    observedCommitSha: observedCommit,
    checks,
    failures: checks.filter((check) => !check.passed).map((check) => check.name),
  };
}
