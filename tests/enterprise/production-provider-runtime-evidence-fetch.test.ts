import { describe, expect, it } from 'vitest';
import {
  selectExactShaRun,
  validateDownloadedEvidence,
} from '../../scripts/enterprise/fetch-production-provider-runtime-evidence.mjs';

const sha = 'a'.repeat(40);
const repository = 'renanescola40-afk/eurocomply_saas';
const workflowPath = '.github/workflows/production-provider-runtime-proof.yml';

function evidence() {
  const providerChecks = {
    github: { repositoryReachable: true, repositoryBound: true, currentMainShaBound: true, protectedProductionEnvironment: true, githubActionsRunBound: true, exactContext: true },
    vercel: {
      apiTokenConfigured: true,
      targetConfigurationBound: true,
      projectReachable: true,
      projectIdentityMatched: true,
      productionEnvironmentEnumerated: true,
      requiredEnvironmentKeysPresent: true,
      transactionalEmailBindingsPresent: true,
      transactionalEmailGuardEnabled: true,
      malwareScanningGuardEnabled: true,
      malwareScannerProviderSupported: true,
      malwareScannerTransportBindingPresent: true,
      metricSnapshotPolicyBindingPresent: true,
      metricSnapshotWritesDisabled: true,
      selectedNonSecretControlsResolved: true,
    },
    supabase: { urlConfigured: true, serviceRoleConfigured: true, projectReachable: true, serviceRoleAuthorized: true },
    stripe: {
      secretConfigured: true,
      apiReachable: true,
      transitionPolicyRejectsLegacy: true,
      legacyAliasesRejected: true,
      fourCanonicalSelfServeBindingsConfigured: true,
      fourCanonicalSelfServePricesVerified: true,
    },
    sentry: { organizationConfigured: true, projectConfigured: true, buildAuthTokenConfigured: true, projectReachable: true, clientKeyInventoryReachable: true, activeClientKeyPresent: true },
  };
  const providers = ['github', 'vercel', 'supabase', 'stripe', 'sentry'] as const;
  return {
    schema: 'risck-comply.production-provider-runtime-evidence.v2',
    evidenceItem: 'production-secrets-provider-stores',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    reviewer: 'protected provider proof',
    summary: 'providers verified',
    valuesRedacted: true,
    runtimeContext: { repository, branch: 'main', environment: 'production', generatedByGithubActions: true, githubRunId: '12345', commitSha: sha },
    providersReviewed: providers.map((provider) => ({ provider, environment: 'production', status: 'reviewed', evidenceLocation: `provider:${provider}`, checks: providerChecks[provider] })),
    rotationOwner: 'platform security',
    nextReviewDue: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    controlsVerified: providers.map((provider) => `${provider} verified`),
    evidenceLocations: [workflowPath, 'config/production-provider-targets.json', 'scripts/security/run-production-provider-runtime-proof.mjs', 'scripts/release/validate-production-secrets-runtime-evidence.mjs'],
    redactionConfirmation: 'No values stored.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawValuesStored: false,
      credentialsStored: false,
      providerResponseBodiesStored: false,
      decryptedProviderEnvironmentValuesStored: false,
      selectedNonSecretControlValuesStored: false,
      exactShaBound: true,
    },
  };
}

describe('production provider exact-SHA evidence handoff', () => {
  it('selects only successful exact-main producer runs', () => {
    const good = { id: 7, path: workflowPath, head_sha: sha, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', updated_at: '2026-08-10T20:00:00Z' };
    expect(selectExactShaRun([
      { ...good, id: 1, head_sha: 'b'.repeat(40) },
      { ...good, id: 2, head_branch: 'feature' },
      { ...good, id: 3, conclusion: 'failure' },
      { ...good, id: 4, path: '.github/workflows/other.yml' },
      good,
    ], sha)).toEqual(good);
  });

  it('accepts the hardened five-provider exact-SHA contract', () => {
    expect(validateDownloadedEvidence(evidence(), { targetSha: sha, repository }).failures).toEqual([]);
  });

  it('rejects stale, wrong-target or provider-incomplete proof', () => {
    const wrongSha = evidence();
    wrongSha.runtimeContext.commitSha = 'b'.repeat(40);
    expect(validateDownloadedEvidence(wrongSha, { targetSha: sha, repository }).passed).toBe(false);

    const wrongVercel = evidence();
    const vercel = wrongVercel.providersReviewed.find((entry) => entry.provider === 'vercel');
    if (!vercel) throw new Error('Vercel provider fixture missing');
    (vercel.checks as Record<string, boolean>).projectIdentityMatched = false;
    expect(validateDownloadedEvidence(wrongVercel, { targetSha: sha, repository }).passed).toBe(false);

    const legacyStripe = evidence();
    const stripe = legacyStripe.providersReviewed.find((entry) => entry.provider === 'stripe');
    if (!stripe) throw new Error('Stripe provider fixture missing');
    (stripe.checks as Record<string, boolean>).legacyAliasesRejected = false;
    expect(validateDownloadedEvidence(legacyStripe, { targetSha: sha, repository }).passed).toBe(false);

    const missing = evidence();
    missing.providersReviewed = missing.providersReviewed.filter((entry) => entry.provider !== 'stripe');
    expect(validateDownloadedEvidence(missing, { targetSha: sha, repository }).passed).toBe(false);
  });
});