import { describe, expect, it } from 'vitest';

import { validateProductionSecretsRuntimeEvidence } from './validate-production-secrets-runtime-evidence.mjs';

const now = new Date('2026-08-10T20:00:00Z');
const sha = 'a'.repeat(40);
const repository = 'renanescola40-afk/eurocomply_saas';

const checks = {
  github: {
    repositoryReachable: true,
    repositoryBound: true,
    currentMainShaBound: true,
    protectedProductionEnvironment: true,
    githubActionsRunBound: true,
    exactContext: true,
  },
  vercel: {
    apiTokenConfigured: true,
    targetConfigurationBound: true,
    projectReachable: true,
    projectIdentityMatched: true,
    productionEnvironmentEnumerated: true,
    requiredEnvironmentKeysPresent: true,
  },
  supabase: {
    urlConfigured: true,
    serviceRoleConfigured: true,
    projectReachable: true,
    serviceRoleAuthorized: true,
  },
  stripe: {
    secretConfigured: true,
    apiReachable: true,
    transitionPolicyRejectsLegacy: true,
    legacyAliasesRejected: true,
    fourCanonicalSelfServeBindingsConfigured: true,
    fourCanonicalSelfServePricesVerified: true,
  },
  sentry: {
    organizationConfigured: true,
    projectConfigured: true,
    buildAuthTokenConfigured: true,
    projectReachable: true,
    clientKeyInventoryReachable: true,
    activeClientKeyPresent: true,
  },
};

function completeEvidence(overrides = {}) {
  const providers = ['github', 'vercel', 'supabase', 'stripe', 'sentry'];
  return {
    schema: 'risck-comply.production-provider-runtime-evidence.v2',
    evidenceItem: 'production-secrets-provider-stores',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-08-10T19:50:00Z',
    reviewedAt: '2026-08-10T19:50:00Z',
    reviewer: 'RISCK COMPLY protected production provider proof',
    summary: 'Five production providers were verified.',
    valuesRedacted: true,
    runtimeContext: {
      repository,
      branch: 'main',
      environment: 'production',
      generatedByGithubActions: true,
      githubRunId: '31420000000',
      commitSha: sha,
    },
    providersReviewed: providers.map((provider) => ({
      provider,
      environment: 'production',
      status: 'reviewed',
      evidenceLocation: `protected:${provider}`,
      checks: checks[provider],
    })),
    rotationOwner: 'Platform and Security release owners',
    nextReviewDue: '2026-08-17T19:50:00Z',
    controlsVerified: providers.map((provider) => `${provider} verified`),
    evidenceLocations: [
      '.github/workflows/production-provider-runtime-proof.yml',
      'config/production-provider-targets.json',
      'scripts/security/run-production-provider-runtime-proof.mjs',
      'scripts/release/validate-production-secrets-runtime-evidence.mjs',
    ],
    redactionConfirmation: 'No secret values are stored.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawValuesStored: false,
      credentialsStored: false,
      providerResponseBodiesStored: false,
      decryptedProviderEnvironmentValuesStored: false,
      exactShaBound: true,
    },
    ...overrides,
  };
}

describe('validateProductionSecretsRuntimeEvidence', () => {
  it('accepts fresh redacted exact-SHA proof for all five production providers', () => {
    expect(validateProductionSecretsRuntimeEvidence(completeEvidence(), { now, expectedCommitSha: sha })).toEqual([]);
  });

  it('rejects stale provider evidence', () => {
    expect(validateProductionSecretsRuntimeEvidence(
      completeEvidence({ generatedAt: '2026-07-21T00:00:00Z' }),
      { now, expectedCommitSha: sha },
    )).toContain('evidence timestamp is older than 7 days');
  });

  it('rejects commit-unbound provider evidence', () => {
    const evidence = completeEvidence();
    evidence.runtimeContext.commitSha = 'b'.repeat(40);
    expect(validateProductionSecretsRuntimeEvidence(evidence, { now, expectedCommitSha: sha })).toContain(
      `runtime commit SHA must match ${sha}`,
    );
  });

  it('rejects missing provider proof including Stripe and Sentry', () => {
    const evidence = completeEvidence();
    evidence.providersReviewed = evidence.providersReviewed.filter((entry) => entry.provider !== 'sentry');
    expect(validateProductionSecretsRuntimeEvidence(evidence, { now })).toContain(
      'providersReviewed must include sentry exactly once',
    );
  });

  it('rejects a Vercel proof that does not bind the expected project identity', () => {
    const evidence = completeEvidence();
    const vercel = evidence.providersReviewed.find((entry) => entry.provider === 'vercel');
    vercel.checks.projectIdentityMatched = false;
    expect(validateProductionSecretsRuntimeEvidence(evidence, { now })).toContain(
      'vercel.projectIdentityMatched must be true',
    );
  });

  it('rejects a Vercel proof missing a required production environment key', () => {
    const evidence = completeEvidence();
    const vercel = evidence.providersReviewed.find((entry) => entry.provider === 'vercel');
    vercel.checks.requiredEnvironmentKeysPresent = false;
    expect(validateProductionSecretsRuntimeEvidence(evidence, { now })).toContain(
      'vercel.requiredEnvironmentKeysPresent must be true',
    );
  });

  it('rejects Stripe proof that falls back to legacy aliases or misses a canonical self-serve Price', () => {
    const evidence = completeEvidence();
    const stripe = evidence.providersReviewed.find((entry) => entry.provider === 'stripe');
    stripe.checks.legacyAliasesRejected = false;
    stripe.checks.fourCanonicalSelfServePricesVerified = false;
    const failures = validateProductionSecretsRuntimeEvidence(evidence, { now });
    expect(failures).toContain('stripe.legacyAliasesRejected must be true');
    expect(failures).toContain('stripe.fourCanonicalSelfServePricesVerified must be true');
  });

  it('rejects Sentry when the active client-key inventory cannot prove a DSN', () => {
    const evidence = completeEvidence();
    const sentry = evidence.providersReviewed.find((entry) => entry.provider === 'sentry');
    sentry.checks.activeClientKeyPresent = false;
    expect(validateProductionSecretsRuntimeEvidence(evidence, { now })).toContain(
      'sentry.activeClientKeyPresent must be true',
    );
  });

  it('rejects runtime evidence containing provider values or credentials', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.decryptedProviderEnvironmentValuesStored = true;
    expect(validateProductionSecretsRuntimeEvidence(evidence, { now })).toContain(
      'evidenceIntegrity.decryptedProviderEnvironmentValuesStored must be false',
    );
  });

  it('rejects wrong repository or branch provenance', () => {
    const evidence = completeEvidence();
    evidence.runtimeContext.repository = 'other/repo';
    evidence.runtimeContext.branch = 'feature';
    const failures = validateProductionSecretsRuntimeEvidence(evidence, { now });
    expect(failures).toContain(`runtime repository must match ${repository}`);
    expect(failures).toContain('runtime branch must match main');
  });
});
