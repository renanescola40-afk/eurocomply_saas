const FULL_SHA = /^[a-f0-9]{40}$/;
const ALLOWED_TARGETS = new Set(['production', 'public-production']);
const REQUIRED_RUNTIME_EVIDENCE = [
  'docs/security/evidence/runtime/deployment-smoke-validation.json',
  'docs/security/evidence/runtime/observability-smoke-validation.json',
  'docs/security/evidence/runtime/rollback-dry-run-validation.json',
  'docs/security/evidence/runtime/supabase-live-rls-validation.json',
];
const REQUIRED_COMMANDS = [
  'npm ci',
  'npm run lint',
  'npm run typecheck',
  'npm run test',
  'npm run build',
  'npx playwright install --with-deps chromium',
  'npm run test:e2e',
  'npm run security:ci',
  'npm run security:rls:live',
  'npm run release:deployment-smoke',
  'npm run release:observability-smoke',
  'npm run release:rollback:dry-run',
  'npm run security:branch-protection-evidence',
  'npm run security:release-candidate',
  'npm run security:release-evidence',
  'npm run security:release-approval',
  'npm run security:release-go-no-go',
  'npm run security:release-rollback',
  'npm run security:release-incident-response',
  'npm run security:release-post-incident',
  'npm run security:release-support-readiness',
  'npm run security:release-operations',
  'npm run security:p0-runtime-gap:strict',
];

function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function commandPassedExactlyOnce(evidence, command) {
  const matches = (Array.isArray(evidence?.commands) ? evidence.commands : [])
    .filter((entry) => entry?.command === command);
  if (matches.length !== 1) return false;
  const result = matches[0]?.result ?? matches[0]?.passed;
  return result === 'passed' || result === true;
}

export function validatePublicProductionFinalRuntimeEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = 7,
    expectedCommitSha,
    expectedBuildSha = expectedCommitSha,
    expectedReleaseTarget,
  } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  const commitSha = String(evidence?.commitSha ?? '').trim().toLowerCase();
  const buildSha = String(evidence?.buildSha ?? '').trim().toLowerCase();
  const expectedCommit = String(expectedCommitSha ?? '').trim().toLowerCase();
  const expectedBuild = String(expectedBuildSha ?? '').trim().toLowerCase();

  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];
  if (evidence?.schema !== 'risck-comply.public-production-final-validation.v1') {
    failures.push('schema must be risck-comply.public-production-final-validation.v1');
  }
  if (evidence?.evidenceItem !== 'production-final-validation') {
    failures.push('evidenceItem must be production-final-validation');
  }

  const generatedAt = parseTimestamp(evidence?.generatedAt ?? evidence?.reviewedAt);
  if (generatedAt === null) failures.push('generatedAt must be an ISO-8601 timestamp');
  else {
    const ageMs = nowMs - generatedAt;
    if (ageMs < 0) failures.push('generatedAt must not be in the future');
    if (ageMs > maxAgeDays * 24 * 60 * 60 * 1000) {
      failures.push(`generatedAt is older than ${maxAgeDays} days`);
    }
  }

  if (evidence?.status !== 'Complete') {
    failures.push('status must be Complete');
    return failures;
  }
  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');
  if (!ALLOWED_TARGETS.has(evidence?.releaseTarget)) {
    failures.push('releaseTarget must be production or public-production');
  }
  if (expectedReleaseTarget && evidence?.releaseTarget !== expectedReleaseTarget) {
    failures.push(`releaseTarget must match ${expectedReleaseTarget}`);
  }

  if (!FULL_SHA.test(commitSha)) failures.push('commitSha must be a full lowercase commit SHA');
  if (!FULL_SHA.test(buildSha)) failures.push('buildSha must be a full lowercase commit SHA');
  if (!FULL_SHA.test(expectedCommit)) failures.push('expectedCommitSha must be a full lowercase commit SHA');
  if (!FULL_SHA.test(expectedBuild)) failures.push('expectedBuildSha must be a full lowercase commit SHA');
  if (FULL_SHA.test(expectedCommit) && commitSha !== expectedCommit) failures.push('commitSha must match expected commit SHA');
  if (FULL_SHA.test(expectedBuild) && buildSha !== expectedBuild) failures.push('buildSha must match expected build SHA');

  if (evidence?.profile?.name !== 'public-production') failures.push('profile.name must be public-production');
  for (const flag of [
    'requiresLiveRlsEvidence',
    'requiresDeploymentSmoke',
    'requiresObservabilitySmoke',
    'requiresRollbackDryRun',
  ]) {
    if (evidence?.profile?.[flag] !== true) failures.push(`profile.${flag} must be true`);
  }
  for (const flag of [
    'requiresEnterpriseRuntimeEvidence',
    'requiresExternalReviewEvidence',
    'requiresEnterpriseSourceMapCredentials',
    'requiresEnterpriseMalwareScannerTransport',
  ]) {
    if (evidence?.profile?.[flag] !== false) failures.push(`profile.${flag} must be false`);
  }

  if (!Array.isArray(evidence?.commands) || evidence.commands.length !== REQUIRED_COMMANDS.length) {
    failures.push(`commands must contain exactly ${REQUIRED_COMMANDS.length} public release commands`);
  }
  for (const command of REQUIRED_COMMANDS) {
    if (!commandPassedExactlyOnce(evidence, command)) {
      failures.push(`commands must contain exactly one passing ${command}`);
    }
  }

  const runtimeEvidence = evidence?.runtimeEvidence;
  if (!runtimeEvidence || typeof runtimeEvidence !== 'object' || Array.isArray(runtimeEvidence)) {
    failures.push('runtimeEvidence must be an object');
  } else {
    const actualKeys = Object.keys(runtimeEvidence).sort();
    const requiredKeys = [...REQUIRED_RUNTIME_EVIDENCE].sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(requiredKeys)) {
      failures.push('runtimeEvidence must contain exactly the four public runtime evidence files');
    }
    for (const path of REQUIRED_RUNTIME_EVIDENCE) {
      const item = runtimeEvidence[path];
      if (item?.present !== true) failures.push(`${path} must be present`);
      if (item?.status !== 'Complete') failures.push(`${path} must be Complete`);
      if (item?.outcome !== 'passed') failures.push(`${path} outcome must be passed`);
    }
  }

  for (const [field, value] of [
    ['commandFailures', evidence?.commandFailures],
    ['evidenceFailures', evidence?.evidenceFailures],
    ['metadataFailures', evidence?.metadataFailures],
  ]) {
    if (!Array.isArray(value) || value.length !== 0) failures.push(`${field} must be an empty array`);
  }

  if (evidence?.noSecretsStored !== true) failures.push('noSecretsStored must be true');
  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) failures.push('evidenceIntegrity.containsSensitiveValues must be false');
  if (evidence?.evidenceIntegrity?.valuesRedacted !== true) failures.push('evidenceIntegrity.valuesRedacted must be true');
  if (evidence?.evidenceIntegrity?.authorizationHeaderStored !== false) failures.push('evidenceIntegrity.authorizationHeaderStored must be false');
  if (evidence?.evidenceIntegrity?.cookiesStored !== false) failures.push('evidenceIntegrity.cookiesStored must be false');
  if (evidence?.evidenceIntegrity?.rawUrlsStored !== false) failures.push('evidenceIntegrity.rawUrlsStored must be false');

  return failures;
}
