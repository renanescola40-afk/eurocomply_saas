import { describe, expect, it } from 'vitest';

import { validatePublicProductionFinalRuntimeEvidence } from './validate-public-production-final-runtime-evidence.mjs';

const sha = 'a'.repeat(40);
const now = new Date('2026-08-12T00:00:00Z');
const runtimePaths = [
  'docs/security/evidence/runtime/deployment-smoke-validation.json',
  'docs/security/evidence/runtime/observability-smoke-validation.json',
  'docs/security/evidence/runtime/rollback-dry-run-validation.json',
  'docs/security/evidence/runtime/supabase-live-rls-validation.json',
];
const commands = [
  'npm ci', 'npm run lint', 'npm run typecheck', 'npm run test', 'npm run build',
  'npx playwright install --with-deps chromium', 'npm run test:e2e', 'npm run security:ci',
  'npm run security:rls:live', 'npm run release:deployment-smoke', 'npm run release:observability-smoke',
  'npm run release:rollback:dry-run', 'npm run security:branch-protection-evidence',
  'npm run security:release-candidate', 'npm run security:release-evidence', 'npm run security:release-approval',
  'npm run security:release-go-no-go', 'npm run security:release-rollback',
  'npm run security:release-incident-response', 'npm run security:release-post-incident',
  'npm run security:release-support-readiness', 'npm run security:release-operations',
  'npm run security:p0-runtime-gap:strict',
];

function completeEvidence(overrides = {}) {
  return {
    schema: 'risck-comply.public-production-final-validation.v1',
    evidenceItem: 'production-final-validation',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: '2026-08-11T23:00:00Z',
    reviewedAt: '2026-08-11T23:00:00Z',
    releaseTarget: 'public-production',
    commitSha: sha,
    buildSha: sha,
    profile: {
      name: 'public-production',
      requiresLiveRlsEvidence: true,
      requiresDeploymentSmoke: true,
      requiresObservabilitySmoke: true,
      requiresRollbackDryRun: true,
      requiresEnterpriseRuntimeEvidence: false,
      requiresExternalReviewEvidence: false,
      requiresEnterpriseSourceMapCredentials: false,
      requiresEnterpriseMalwareScannerTransport: false,
    },
    noSecretsStored: true,
    commands: commands.map((command) => ({ command, result: 'passed', passed: true })),
    runtimeEvidence: Object.fromEntries(runtimePaths.map((path) => [path, {
      path, present: true, status: 'Complete', outcome: 'passed',
    }])),
    commandFailures: [],
    evidenceFailures: [],
    metadataFailures: [],
    evidenceIntegrity: {
      containsSensitiveValues: false,
      valuesRedacted: true,
      authorizationHeaderStored: false,
      cookiesStored: false,
      rawUrlsStored: false,
    },
    ...overrides,
  };
}

describe('validatePublicProductionFinalRuntimeEvidence', () => {
  it('accepts strict exact-SHA public production evidence without enterprise-only requirements', () => {
    expect(validatePublicProductionFinalRuntimeEvidence(completeEvidence(), {
      now,
      expectedCommitSha: sha,
      expectedReleaseTarget: 'public-production',
    })).toEqual([]);
  });

  it('rejects a mismatched exact SHA', () => {
    expect(validatePublicProductionFinalRuntimeEvidence(completeEvidence({ commitSha: 'b'.repeat(40) }), {
      now,
      expectedCommitSha: sha,
    })).toContain('commitSha must match expected commit SHA');
  });

  it('rejects missing public runtime evidence', () => {
    const evidence = completeEvidence();
    delete evidence.runtimeEvidence[runtimePaths[1]];
    expect(validatePublicProductionFinalRuntimeEvidence(evidence, { now, expectedCommitSha: sha }))
      .toContain('runtimeEvidence must contain exactly the four public runtime evidence files');
  });

  it('rejects enterprise-only profile drift', () => {
    const evidence = completeEvidence();
    evidence.profile.requiresEnterpriseRuntimeEvidence = true;
    expect(validatePublicProductionFinalRuntimeEvidence(evidence, { now, expectedCommitSha: sha }))
      .toContain('profile.requiresEnterpriseRuntimeEvidence must be false');
  });

  it('rejects incomplete command execution', () => {
    const evidence = completeEvidence();
    evidence.commands.pop();
    expect(validatePublicProductionFinalRuntimeEvidence(evidence, { now, expectedCommitSha: sha }))
      .toContain(`commands must contain exactly ${commands.length} public release commands`);
  });

  it('rejects stored authorization headers', () => {
    const evidence = completeEvidence();
    evidence.evidenceIntegrity.authorizationHeaderStored = true;
    expect(validatePublicProductionFinalRuntimeEvidence(evidence, { now, expectedCommitSha: sha }))
      .toContain('evidenceIntegrity.authorizationHeaderStored must be false');
  });
});
