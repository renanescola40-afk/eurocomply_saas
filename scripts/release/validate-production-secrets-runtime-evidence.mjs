function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

const requiredProviders = ['github', 'vercel', 'supabase'];
const requiredEnvironments = ['production'];

export function validateProductionSecretsRuntimeEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = 7,
    expectedCommitSha,
  } = {},
) {
  const failures = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));

  if (!Number.isFinite(nowMs)) return ['validation clock must be a valid timestamp'];
  if (evidence?.evidenceItem !== 'production-secrets-provider-stores') {
    failures.push('evidenceItem must be production-secrets-provider-stores');
  }

  const generatedAt = parseTimestamp(evidence?.generatedAt ?? evidence?.reviewedAt ?? evidence?.timestamp);
  if (generatedAt === null) {
    failures.push('generatedAt, reviewedAt, or timestamp must be an ISO-8601 timestamp');
  } else {
    const ageMs = nowMs - generatedAt;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    if (ageMs < 0) failures.push('evidence timestamp must not be in the future');
    if (ageMs > maxAgeMs) failures.push(`evidence timestamp is older than ${maxAgeDays} days`);
  }

  if (evidence?.status === 'Exception') {
    const expiresAt = parseTimestamp(evidence?.exception?.expiresAt);
    if (expiresAt === null) failures.push('exception.expiresAt must be an ISO-8601 timestamp');
    else if (expiresAt < nowMs) failures.push('production secrets exception has expired');
  }

  if (evidence?.status !== 'Complete') return failures;

  if (evidence?.valuesRedacted !== true) failures.push('valuesRedacted must be true');
  if (evidence?.evidenceIntegrity?.containsSensitiveValues !== false) {
    failures.push('evidenceIntegrity.containsSensitiveValues must be false');
  }
  if (evidence?.evidenceIntegrity?.rawValuesStored !== false) {
    failures.push('evidenceIntegrity.rawValuesStored must be false');
  }
  if (evidence?.evidenceIntegrity?.credentialsStored !== false) {
    failures.push('evidenceIntegrity.credentialsStored must be false');
  }

  const commitSha = String(evidence?.runtimeContext?.commitSha ?? evidence?.commitSha ?? '');
  if (!/^[a-f0-9]{40}$/i.test(commitSha)) failures.push('runtime commit SHA must be a full commit SHA');
  if (expectedCommitSha && commitSha !== expectedCommitSha) {
    failures.push(`runtime commit SHA must match ${expectedCommitSha}`);
  }
  if (evidence?.runtimeContext?.generatedByGithubActions !== true) {
    failures.push('runtimeContext.generatedByGithubActions must be true');
  }
  if (!String(evidence?.runtimeContext?.githubRunId ?? '').trim()) {
    failures.push('runtimeContext.githubRunId is required');
  }

  const providers = Array.isArray(evidence?.providersReviewed) ? evidence.providersReviewed : [];
  for (const provider of requiredProviders) {
    const matches = providers.filter((entry) => String(entry?.provider ?? '').toLowerCase() === provider);
    if (matches.length !== 1) {
      failures.push(`providersReviewed must include ${provider} exactly once`);
      continue;
    }
    const entry = matches[0];
    if (entry.status !== 'reviewed') failures.push(`${provider} provider status must be reviewed`);
    if (!requiredEnvironments.includes(String(entry.environment ?? '').toLowerCase())) {
      failures.push(`${provider} provider environment must be production`);
    }
    if (!String(entry.evidenceLocation ?? '').trim()) failures.push(`${provider} evidenceLocation is required`);
  }

  if (!String(evidence?.rotationOwner ?? '').trim()) failures.push('rotationOwner is required');
  const nextReviewDue = parseTimestamp(evidence?.nextReviewDue);
  if (nextReviewDue === null) failures.push('nextReviewDue must be an ISO-8601 timestamp');
  else if (nextReviewDue < nowMs) failures.push('nextReviewDue must not be expired');

  return failures;
}
