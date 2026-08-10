import { describe, expect, it } from 'vitest';
import {
  normalizeAuditChainEvidenceForP0,
  selectExactShaRun,
  validateCanonicalAuditChainEvidence,
  validateRawAuditChainEvidence,
} from '../../scripts/enterprise/fetch-audit-chain-runtime-evidence.mjs';

const sha = 'a'.repeat(40);
const repository = 'renanescola40-afk/eurocomply_saas';

function rawEvidence(now: string) {
  return {
    evidenceItem: 'audit-chain-live-validation',
    status: 'Complete',
    generatedAt: now,
    redactionConfirmation: 'Redaction confirmed for runtime evidence.',
    sourceValidation: { status: true, failures: [] },
    runtimeConfiguration: {
      hasSupabaseUrl: true,
      hasServiceRoleKey: true,
      hasAuditSigningSecret: true,
      hasEvidencePackSigningSecret: true,
      hasTargetOrganization: true,
      ephemeralFixtureMode: true,
      persistentFixtureSecretsRequired: false,
      liveProof: { present: true },
    },
    liveValidation: {
      status: 'Complete',
      fixtureMode: 'ephemeral',
      ephemeralFixturesCreated: true,
      appendNormal: { status: 'Complete' },
      appendConcurrent: { status: 'Complete' },
      tamperDetection: { status: 'Complete' },
      missingPreviousHash: { status: 'Complete' },
      readbackVerification: { status: 'Complete', checked: 3, failureCount: 0 },
      cleanup: {
        status: 'Complete',
        auditEventsRemoved: true,
        authFixturesRemoved: true,
        failureCodes: [],
      },
    },
    acceptanceCriteria: {
      migrationsApplied: true,
      rpcExists: true,
      createAuditEventUsesTransactionalRpc: true,
      appendNormal: true,
      appendConcurrent: true,
      auditChainDetectsTampering: true,
      missingPreviousHashDetected: true,
      verificationRequiresRbacAndStepUp: true,
      exportRequiresRbacAndStepUp: true,
      exportIsSigned: true,
      ephemeralFixtureCleanup: true,
      liveProofAttached: true,
    },
    releaseGate: { enterpriseRelease: true, blocked: false, reason: null },
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      rawAuditPayloadsStored: false,
      rawIdentifiersStored: false,
      persistentFixtureCredentialsStored: false,
      syntheticAuditEventsRetained: false,
      ephemeralFixtureCleanupVerified: true,
    },
  };
}

describe('audit-chain exact-SHA evidence promotion', () => {
  it('selects successful exact-main push or manual proof and rejects stale/wrong runs', () => {
    const automatic = {
      id: 1,
      path: '.github/workflows/audit-chain-runtime-proof.yml',
      head_sha: sha,
      head_branch: 'main',
      event: 'push',
      status: 'completed',
      conclusion: 'success',
      updated_at: '2026-08-10T18:02:00Z',
    };
    const manual = {
      ...automatic,
      id: 2,
      event: 'workflow_dispatch',
      updated_at: '2026-08-10T18:01:00Z',
    };

    expect(selectExactShaRun([
      manual,
      { ...automatic, id: 3, head_sha: 'b'.repeat(40) },
      { ...automatic, id: 4, head_branch: 'feature' },
      { ...automatic, id: 5, conclusion: 'failure' },
      automatic,
    ], sha)).toEqual(automatic);
  });

  it('rejects raw evidence unless every live security and cleanup criterion is proven', () => {
    const now = new Date().toISOString();
    expect(validateRawAuditChainEvidence(rawEvidence(now)).failures).toEqual([]);

    const incomplete = rawEvidence(now);
    incomplete.acceptanceCriteria.auditChainDetectsTampering = false;
    expect(validateRawAuditChainEvidence(incomplete).failures).toContain('acceptance_auditChainDetectsTampering_failed');

    const dirty = rawEvidence(now);
    dirty.liveValidation.cleanup.auditEventsRemoved = false;
    dirty.evidenceIntegrity.syntheticAuditEventsRetained = true;
    const failures = validateRawAuditChainEvidence(dirty).failures;
    expect(failures).toContain('synthetic_audit_events_not_removed');
    expect(failures).toContain('synthetic_audit_events_retained');
  });

  it('adds exact GitHub provenance without inventing live control results', () => {
    const now = new Date();
    const raw = rawEvidence(now.toISOString());
    const canonical = normalizeAuditChainEvidenceForP0(raw, {
      targetSha: sha,
      repository,
      runId: '12345',
      verifiedAt: now.toISOString(),
    });

    expect(canonical.targetLiveValidation).toBe(raw.liveValidation);
    expect(canonical.verification_provenance).toMatchObject({
      method: 'github_actions',
      repository,
      branch: 'main',
      githubRunId: '12345',
      commitSha: sha,
    });
    expect(canonical.evidenceIntegrity).toEqual(expect.objectContaining({
      containsSensitiveValues: false,
      credentialsStored: false,
      rawAuditPayloadsStored: false,
      rawIdentifiersStored: false,
      syntheticAuditEventsRetained: false,
      ephemeralFixtureCleanupVerified: true,
    }));

    expect(validateCanonicalAuditChainEvidence(canonical, { targetSha: sha, repository, now }).failures).toEqual([]);
  });

  it('rejects canonical evidence when disposable fixture cleanup is not proven', () => {
    const now = new Date();
    const canonical = normalizeAuditChainEvidenceForP0(rawEvidence(now.toISOString()), {
      targetSha: sha,
      repository,
      runId: '12345',
      verifiedAt: now.toISOString(),
    });
    canonical.targetLiveValidation.cleanup.authFixturesRemoved = false;

    expect(validateCanonicalAuditChainEvidence(canonical, { targetSha: sha, repository, now }).failures)
      .toContain('targetLiveValidation.cleanup.authFixturesRemoved must be true');
  });
});
