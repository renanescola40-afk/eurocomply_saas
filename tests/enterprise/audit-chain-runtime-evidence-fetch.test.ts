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
    redactionConfirmation: 'No secrets or full identifiers are stored.',
    sourceValidation: { status: true, failures: [] },
    runtimeConfiguration: {
      hasSupabaseUrl: true,
      hasServiceRoleKey: true,
      hasAuditSigningSecret: true,
      hasEvidencePackSigningSecret: true,
      hasTargetOrganization: true,
      liveProof: { present: true },
    },
    liveValidation: {
      status: 'Complete',
      appendNormal: { status: 'Complete' },
      appendConcurrent: { status: 'Complete' },
      tamperDetection: { status: 'Complete' },
      missingPreviousHash: { status: 'Complete' },
      readbackVerification: { status: 'Complete', checked: 3, failureCount: 0 },
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
      liveProofAttached: true,
    },
    releaseGate: { enterpriseRelease: true, blocked: false, reason: null },
  };
}

describe('audit-chain exact-SHA evidence promotion', () => {
  it('selects only successful workflow-dispatch proof for exact main SHA', () => {
    const run = selectExactShaRun([
      { id: 1, path: '.github/workflows/audit-chain-runtime-proof.yml', head_sha: sha, head_branch: 'main', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', updated_at: '2026-08-10T18:00:00Z' },
      { id: 2, path: '.github/workflows/audit-chain-runtime-proof.yml', head_sha: 'b'.repeat(40), head_branch: 'main', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', updated_at: '2026-08-10T18:01:00Z' },
      { id: 3, path: '.github/workflows/audit-chain-runtime-proof.yml', head_sha: sha, head_branch: 'main', event: 'workflow_dispatch', status: 'completed', conclusion: 'failure', updated_at: '2026-08-10T18:02:00Z' },
    ], sha);

    expect(run?.id).toBe(1);
  });

  it('rejects raw evidence unless every live security criterion is proven', () => {
    const now = new Date().toISOString();
    expect(validateRawAuditChainEvidence(rawEvidence(now)).failures).toEqual([]);

    const incomplete = rawEvidence(now);
    incomplete.acceptanceCriteria.auditChainDetectsTampering = false;
    expect(validateRawAuditChainEvidence(incomplete).failures).toContain('acceptance_auditChainDetectsTampering_failed');
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
    }));

    expect(validateCanonicalAuditChainEvidence(canonical, { targetSha: sha, repository, now }).failures).toEqual([]);
  });
});
