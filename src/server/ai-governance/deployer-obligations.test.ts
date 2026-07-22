import { describe, expect, it } from 'vitest';
import { decideDeployerObligation, summarizeDeployerWorkspace } from './deployer-obligations';

describe('deployer obligations', () => {
  it('fails closed when applicability is unresolved', () => {
    expect(decideDeployerObligation({ id: 'fria', applicable: null, evidenceIds: [], openCriticalFindings: 0, stale: false })).toMatchObject({ status: 'blocked', canApprove: false });
  });
  it('requires rationale for not applicable', () => {
    expect(decideDeployerObligation({ id: 'dpia', applicable: false, evidenceIds: [], openCriticalFindings: 0, stale: false }).blockers).toContain('not_applicable_rationale_missing');
  });
  it('marks a fully evidenced obligation ready', () => {
    const input = { id: 'monitoring', applicable: true, ownerId: 'owner', dueAt: '2027-01-01', evidenceIds: ['e1'], approvedBy: 'approver', approvalAt: '2026-07-22', openCriticalFindings: 0, stale: false };
    expect(decideDeployerObligation(input)).toEqual({ status: 'ready', blockers: [], canApprove: true });
    expect(summarizeDeployerWorkspace([input]).releaseBlocked).toBe(false);
  });
});
