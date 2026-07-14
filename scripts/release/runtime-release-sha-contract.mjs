const FULL_GIT_SHA_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeReleaseSha(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return FULL_GIT_SHA_PATTERN.test(normalized) ? normalized : null;
}

export function sanitizeRuntimeReleaseResponse(value) {
  const body = isRecord(value) ? value : null;
  const release = isRecord(body?.release) ? body.release : null;
  const provenance = release?.provenance === 'vercel'
    ? 'vercel'
    : release?.provenance === 'build-env'
      ? 'build-env'
      : 'unavailable';

  return {
    statusOk: body?.status === 'ok',
    available: release?.available === true,
    observedCommitSha: normalizeReleaseSha(release?.commitSha),
    provenance,
  };
}

export function selectPersistedObservedCommitSha({ expectedCommitSha, observedCommitSha }) {
  const expectedCommit = normalizeReleaseSha(expectedCommitSha);
  const observedCommit = normalizeReleaseSha(observedCommitSha);
  return expectedCommit && observedCommit && expectedCommit === observedCommit
    ? expectedCommit
    : null;
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
