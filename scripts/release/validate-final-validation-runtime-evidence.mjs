function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

export const requiredFinalValidationCommands = [
  'npm ci',
  'npm run lint',
  'npm run typecheck',
  'npm run test',
  'npm run build',
  'npm run test:e2e',
  'npm run security:ci',
  'npm run security:rls:live',
  'npm run release:deployment-smoke',
  'npm run release:observability-smoke',
  'npm run release:rollback:dry-run',
  'npm run release:enterprise-runtime-evidence',
  'npm run security:p0-runtime-gap:strict',
];

const allowedStatuses = new Set(['Open', 'Exception', 'Complete']);
const allowedBlockedOutcomes = new Set(['blocked', 'not_verified']);

function commandPassed(evidence, commandName) {
  const matches = (evidence?.commands ?? []).filter((entry) => entry?.command === commandName);
  if (matches.length !== 1) return false;
  const result = matches[0]?.result ?? matches[0]?.passed;
  return ['passed', 'Go', 'GO', true].includes(result);
}

export function validateFinalValidationRuntimeEvidence(
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

  if (evidence?.evidenceItem !== 'final-validation-runner') {
    failures.push('evidenceItem must be final-validation-runner');
  }

  const generatedAt = parseTimestamp(evidence?.generatedAt ?? evidence?.reviewedAt);
  if (generatedAt === null) failures.push('generatedAt must be an ISO-8601 timestamp');
  else {
    const ageMs = nowMs - generatedAt;
    if (ageMs < 0) failures.push('generatedAt must not be in the future');
    if (ageMs > maxAgeDays * 24 * 60 * 60 * 1000) failures.push(`generatedAt is older than ${maxAgeDays} days`);
  }

  const status = evidence?.status;
  if (!allowedStatuses.has(status)) {
    failures.push('status must be Open, Exception or Complete');
    return failures;
  }

  if (status === 'Open') {
    if (!allowedBlockedOutcomes.has(evidence?.outcome)) {
      failures.push('Open evidence outcome must be blocked or not_verified');
    }
    if (evidence?.releaseDecision === 'Go') {
      failures.push('Open evidence releaseDecision must not be Go');
    }
    return failures;
  }

  if (status === 'Exception') {
    if (!allowedBlockedOutcomes.has(evidence?.outcome)) {
      failures.push('Exception evidence outcome must be blocked or not_verified');
    }
    if (evidence?.releaseDecision === 'Go') {
      failures.push('Exception evidence releaseDecision must not be Go');
    }
    const expiresAt = parseTimestamp(evidence?.exception?.expiresAt);
    if (expiresAt === null) failures.push('exception.expiresAt must be an ISO-8601 timestamp');
    else if (expiresAt < nowMs) failures.push('final validation exception has expired');
    return failures;
  }

  if (evidence?.outcome !== 'passed') failures.push('Complete evidence outcome must be passed');
  if (evidence?.releaseDecision !== 'Go') failures.push('releaseDecision must be Go');
  if (evidence?.evidenceIntegrity?.placeholderOnly !== false) failures.push('evidenceIntegrity.placeholderOnly must be false');
  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) failures.push('evidenceIntegrity.containsSensitiveValues must be false');
  if (evidence?.evidenceIntegrity?.valuesRedacted !== true) failures.push('evidenceIntegrity.valuesRedacted must be true');
  if (evidence?.evidenceIntegrity?.authorizationHeaderStored !== false) failures.push('evidenceIntegrity.authorizationHeaderStored must be false');
  if (evidence?.evidenceIntegrity?.cookiesStored !== false) failures.push('evidenceIntegrity.cookiesStored must be false');
  if (evidence?.evidenceIntegrity?.rawUrlsStored !== false) failures.push('evidenceIntegrity.rawUrlsStored must be false');

  const runtime = evidence?.runtimeContext ?? {};
  if (runtime.generatedByGithubActions !== true) failures.push('runtimeContext.generatedByGithubActions must be true');
  if (runtime.repository !== expectedRepository) failures.push(`runtimeContext.repository must be ${expectedRepository}`);
  if (runtime.branch !== expectedBranch) failures.push(`runtimeContext.branch must be ${expectedBranch}`);
  if (!String(runtime.githubRunId ?? '').trim()) failures.push('runtimeContext.githubRunId is required');
  const commitSha = String(runtime.commitSha ?? evidence?.commitSha ?? '');
  if (!/^[a-f0-9]{40}$/i.test(commitSha)) failures.push('runtime commit SHA must be a full commit SHA');
  if (expectedCommitSha && commitSha !== expectedCommitSha) failures.push(`runtime commit SHA must match ${expectedCommitSha}`);

  for (const command of requiredFinalValidationCommands) {
    if (!commandPassed(evidence, command)) failures.push(`commands must contain exactly one passing ${command}`);
  }

  if (!Array.isArray(evidence?.failures)) failures.push('failures must be an array');
  else if (evidence.failures.length > 0) failures.push('failures must be empty');

  return failures;
}
