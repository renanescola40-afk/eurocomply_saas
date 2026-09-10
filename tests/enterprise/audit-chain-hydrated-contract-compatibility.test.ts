import { describe, expect, it } from 'vitest';
import { normalizeAuditChainEvidenceForP0 } from '../../scripts/enterprise/fetch-audit-chain-runtime-evidence.mjs';

const sha = 'a'.repeat(40);
const repository = 'renanescola40-afk/eurocomply_saas';

describe('hydrated audit-chain evidence contract compatibility', () => {
  it('retains source-only control vocabulary required by downstream security gates', () => {
    const canonical = normalizeAuditChainEvidenceForP0({
      evidenceItem: 'audit-chain-live-validation',
      status: 'Complete',
      redactionConfirmation: 'Redaction confirmed for runtime evidence.',
      liveValidation: { status: 'Complete' },
      acceptanceCriteria: {
        verificationRequiresRbacAndStepUp: true,
        exportRequiresRbacAndStepUp: true,
        exportIsSigned: true,
      },
    }, {
      targetSha: sha,
      repository,
      runId: '12345',
      verifiedAt: '2026-09-10T08:00:00.000Z',
    });

    const serialized = JSON.stringify(canonical);
    for (const token of [
      'signedExport',
      'verifyWithStepUp',
      'criticalEventCoverage',
      'cliVerifier',
      'auth',
      'rbacDenied',
      'stepUp',
      'billing',
      'webhookFailures',
      'uploads',
      'downloads',
      'exports',
      'teamChanges',
      'documentChanges',
      'risksVendorsTasks',
      'gdpr',
      'securitySettings',
    ]) {
      expect(serialized).toContain(token);
    }

    expect(canonical.runtimeValidation.signedExport).toEqual({
      source: 'src/app/api/audit/evidence-pack/route.test.ts',
      acceptanceCriterion: 'exportIsSigned',
    });
    expect(canonical.runtimeValidation.verifyWithStepUp).toEqual({
      source: 'src/app/api/audit/chain/verify/route.test.ts',
      acceptanceCriterion: 'verificationRequiresRbacAndStepUp',
    });
    expect(canonical.criticalEventCoverage.rbacDenied)
      .toBe('scripts/security/check-audit-critical-coverage.mjs');
  });
});
