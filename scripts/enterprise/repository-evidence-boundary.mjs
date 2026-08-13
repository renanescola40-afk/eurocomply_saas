const FULL_SHA = /^[a-f0-9]{40}$/i;

export const REPOSITORY_EVIDENCE_CHECK_NAMES = Object.freeze([
  'codeql',
  'semgrep',
  'secretScanning',
  'publicSecretScan',
  'dependencyReview',
  'actionlint',
  'publicClaims',
  'fullSecuritySuite',
  'securityCi',
  'dast',
  'npmAudit',
  'deterministicInstall',
  'packageLockAligned',
  'lint',
  'typecheck',
  'unitTests',
  'build',
  'e2e',
  'routeQuality',
]);

function checkStatus(document, name) {
  return document?.checks?.find((item) => item?.name === name)?.status === 'PASS';
}

export function evaluateRepositoryCheckBoundary(githubChecks, targetSha) {
  const normalizedTargetSha = String(targetSha || '').trim().toLowerCase();
  const observedTargetSha = String(githubChecks?.targetSha || '').trim().toLowerCase();
  const exactSha = FULL_SHA.test(normalizedTargetSha) && observedTargetSha === normalizedTargetSha;
  const fullSecuritySuite = checkStatus(githubChecks, 'fullSecuritySuite');
  const requiredChecks = checkStatus(githubChecks, 'requiredChecks');
  const enterpriseProductionGate = checkStatus(githubChecks, 'enterpriseProductionGate');
  const repositoryCheckResults = Object.fromEntries(
    REPOSITORY_EVIDENCE_CHECK_NAMES.map((name) => [name, checkStatus(githubChecks, name)]),
  );
  const missingRepositoryChecks = REPOSITORY_EVIDENCE_CHECK_NAMES.filter(
    (name) => repositoryCheckResults[name] !== true,
  );
  const namedRepositoryChecksPassed = missingRepositoryChecks.length === 0;
  const sourceVerified = githubChecks?.generatedFromRealEvidence === true
    && githubChecks?.source === 'github-actions-api';

  const legacyFullReleaseProof = githubChecks?.status === 'Complete'
    && githubChecks?.outcome === 'passed'
    && exactSha
    && fullSecuritySuite
    && requiredChecks;

  const repositoryEvidenceComplete = exactSha
    && (
      (sourceVerified && namedRepositoryChecksPassed && fullSecuritySuite)
      || legacyFullReleaseProof
    );

  return {
    repositoryEvidenceComplete,
    exactSha,
    fullSecuritySuite,
    requiredChecks,
    enterpriseProductionGate,
    sourceVerified,
    namedRepositoryChecksPassed,
    missingRepositoryChecks,
    repositoryCheckResults,
    releaseEvidenceComplete: githubChecks?.status === 'Complete'
      && githubChecks?.outcome === 'passed'
      && requiredChecks,
    truthBoundary: 'Repository evidence may be complete when every named exact-SHA CI/security check passes even if Enterprise Production Gate is still open or failed. This never grants production/runtime release credit: requiredChecks and enterpriseProductionGate remain independent and authoritative for release closure.',
  };
}
