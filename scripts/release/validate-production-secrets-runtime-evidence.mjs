function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ''));
  return Number.isFinite(timestamp) ? timestamp : null;
}

const requiredProviders = ['github', 'vercel', 'supabase', 'stripe', 'sentry'];
const requiredEnvironments = ['production'];

const providerRequiredChecks = Object.freeze({
  github: ['repositoryReachable', 'repositoryBound', 'currentMainShaBound', 'protectedProductionEnvironment', 'githubActionsRunBound', 'exactContext'],
  vercel: ['apiTokenConfigured', 'targetConfigurationBound', 'projectReachable', 'projectIdentityMatched', 'productionEnvironmentEnumerated', 'requiredEnvironmentKeysPresent'],
  supabase: ['urlConfigured', 'serviceRoleConfigured', 'projectReachable', 'serviceRoleAuthorized'],
  stripe: [
    'secretConfigured',
    'apiReachable',
    'transitionPolicyRejectsLegacy',
    'legacyAliasesRejected',
    'fourCanonicalSelfServeBindingsConfigured',
    'fourCanonicalSelfServePricesVerified',
  ],
  sentry: ['organizationConfigured', 'projectConfigured', 'buildAuthTokenConfigured', 'projectReachable', 'clientKeyInventoryReachable', 'activeClientKeyPresent'],
});

export function validateProductionSecretsRuntimeEvidence(
  evidence,
  {
    now = new Date(),
    maxAgeDays = 7,
    expectedCommitSha,
    expectedRepository = 'renanescola40-afk/eurocomply_saas',
    expectedBranch = 'main',
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

  if (evidence?.outcome !== 'passed') failures.push('outcome must be passed for Complete evidence');
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
  if (evidence?.evidenceIntegrity?.providerResponseBodiesStored !== false) {
    failures.push('evidenceIntegrity.providerResponseBodiesStored must be false');
  }
  if (evidence?.evidenceIntegrity?.decryptedProviderEnvironmentValuesStored !== false) {
    failures.push('evidenceIntegrity.decryptedProviderEnvironmentValuesStored must be false');
  }
  if (evidence?.evidenceIntegrity?.exactShaBound !== true) {
    failures.push('evidenceIntegrity.exactShaBound must be true');
  }

  const commitSha = String(evidence?.runtimeContext?.commitSha ?? evidence?.commitSha ?? '');
  if (!/^[a-f0-9]{40}$/i.test(commitSha)) failures.push('runtime commit SHA must be a full commit SHA');
  if (expectedCommitSha && commitSha !== expectedCommitSha) {
    failures.push(`runtime commit SHA must match ${expectedCommitSha}`);
  }
  if (evidence?.runtimeContext?.repository !== expectedRepository) {
    failures.push(`runtime repository must match ${expectedRepository}`);
  }
  if (evidence?.runtimeContext?.branch !== expectedBranch) {
    failures.push(`runtime branch must match ${expectedBranch}`);
  }
  if (String(evidence?.runtimeContext?.environment ?? '').toLowerCase() !== 'production') {
    failures.push('runtime environment must be production');
  }
  if (evidence?.runtimeContext?.generatedByGithubActions !== true) {
    failures.push('runtimeContext.generatedByGithubActions must be true');
  }
  if (!/^\d+$/.test(String(evidence?.runtimeContext?.githubRunId ?? ''))) {
    failures.push('runtimeContext.githubRunId must be a numeric GitHub Actions run ID');
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

    const checks = entry?.checks && typeof entry.checks === 'object' ? entry.checks : {};
    for (const check of providerRequiredChecks[provider]) {
      if (checks[check] !== true) failures.push(`${provider}.${check} must be true`);
    }
  }

  if (providers.length !== requiredProviders.length) {
    failures.push(`providersReviewed must contain exactly ${requiredProviders.length} provider entries`);
  }
  if (!String(evidence?.rotationOwner ?? '').trim()) failures.push('rotationOwner is required');
  const nextReviewDue = parseTimestamp(evidence?.nextReviewDue);
  if (nextReviewDue === null) failures.push('nextReviewDue must be an ISO-8601 timestamp');
  else if (nextReviewDue < nowMs) failures.push('nextReviewDue must not be expired');

  if (!Array.isArray(evidence?.controlsVerified) || evidence.controlsVerified.length < requiredProviders.length) {
    failures.push(`controlsVerified must include at least ${requiredProviders.length} verified provider controls`);
  }
  if (!Array.isArray(evidence?.evidenceLocations) || evidence.evidenceLocations.length < 4) {
    failures.push('evidenceLocations must include the protected workflow, target configuration, producer and validator');
  }
  if (!String(evidence?.reviewer ?? '').trim()) failures.push('reviewer is required');
  if (!String(evidence?.summary ?? '').trim()) failures.push('summary is required');
  if (!String(evidence?.redactionConfirmation ?? '').trim()) failures.push('redactionConfirmation is required');

  return failures;
}
