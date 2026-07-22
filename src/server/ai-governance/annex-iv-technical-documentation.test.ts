import { describe, expect, it } from 'vitest';
import { buildAnnexIvExportManifest, decideAnnexIvDocumentation } from './annex-iv-technical-documentation';

const complete = { id: 'architecture', applicable: true, ownerId: 'owner', contentVersion: '1.0.0', evidenceIds: ['e1'], approvedBy: 'reviewer', approvedAt: '2026-07-22', materialChangeAfterApproval: false };

describe('Annex IV documentation', () => {
  it('blocks missing evidence and approval', () => {
    const result = decideAnnexIvDocumentation([{ ...complete, evidenceIds: [], approvedBy: null }]);
    expect(result.status).toBe('draft');
    expect(result.blockers).toContain('architecture:evidence_missing');
  });
  it('requires reassessment after material change', () => {
    expect(decideAnnexIvDocumentation([{ ...complete, materialChangeAfterApproval: true }]).status).toBe('review_required');
  });
  it('emits a qualified export without regulator claims', () => {
    expect(buildAnnexIvExportManifest('system-1', [complete])).toMatchObject({ status: 'approved', completeness: 100, regulatorApprovalClaimed: false });
  });
});
