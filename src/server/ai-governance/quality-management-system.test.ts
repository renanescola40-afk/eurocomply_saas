import { describe, expect, it } from 'vitest';
import {
  decideQualityManagementSystem,
  type QmsInput,
} from './quality-management-system';

const complete: QmsInput = {
  scopeDefined: true,
  qualityPolicyApproved: true,
  responsibilitiesAssigned: true,
  documentControlOperating: true,
  recordControlOperating: true,
  designDevelopmentControlsOperating: true,
  supplierControlsOperating: true,
  dataGovernanceLinked: true,
  riskManagementLinked: true,
  postMarketMonitoringLinked: true,
  incidentAndCorrectiveActionLinked: true,
  changeControlOperating: true,
  competenceAndTrainingLinked: true,
  internalAuditComplete: true,
  managementReviewComplete: true,
  correctiveActionsEffective: true,
  regulatoryStrategyReviewed: true,
  accountableOwnerAssigned: true,
  independentReviewerAssigned: true,
  approverAssigned: true,
  severeNonconformitiesOpen: 0,
  overdueCorrectiveActions: 0,
  approvedAt: '2026-07-21T14:30:00Z',
};

describe('decideQualityManagementSystem', () => {
  it('approves a complete independently reviewed QMS', () => {
    const result = decideQualityManagementSystem(complete);

    expect(result.stage).toBe('approved');
    expect(result.productionUseAllowed).toBe(true);
    expect(result.conformityReadinessAllowed).toBe(true);
    expect(result.missingControlIds).toEqual([]);
  });

  it('blocks when a severe nonconformity remains open', () => {
    const result = decideQualityManagementSystem({
      ...complete,
      severeNonconformitiesOpen: 1,
      approvedAt: null,
    });

    expect(result.stage).toBe('blocked');
    expect(result.productionUseAllowed).toBe(false);
    expect(result.blockingControlIds).toContain('QMS-21');
  });

  it('blocks when corrective actions are overdue', () => {
    const result = decideQualityManagementSystem({
      ...complete,
      overdueCorrectiveActions: 2,
      approvedAt: null,
    });

    expect(result.stage).toBe('blocked');
    expect(result.blockingControlIds).toContain('QMS-22');
  });

  it('requires management review before approval', () => {
    const result = decideQualityManagementSystem({
      ...complete,
      managementReviewComplete: false,
      approvedAt: null,
    });

    expect(result.stage).toBe('management_review');
    expect(result.missingControlIds).toContain('QMS-15');
  });

  it('requires legal review when the regulatory strategy is incomplete', () => {
    const result = decideQualityManagementSystem({
      ...complete,
      regulatoryStrategyReviewed: false,
      approvedAt: null,
    });

    expect(result.stage).toBe('approval');
    expect(result.legalReviewRequired).toBe(true);
    expect(result.conformityReadinessAllowed).toBe(false);
  });

  it('retires the workflow without allowing production use', () => {
    const result = decideQualityManagementSystem({
      ...complete,
      retiredAt: '2026-07-21T15:00:00Z',
    });

    expect(result.stage).toBe('retired');
    expect(result.productionUseAllowed).toBe(false);
  });

  it('rejects impossible negative counters', () => {
    expect(() =>
      decideQualityManagementSystem({
        ...complete,
        severeNonconformitiesOpen: -1,
      }),
    ).toThrow(RangeError);
  });

  it('preserves the non-certification boundary', () => {
    expect(decideQualityManagementSystem(complete).evidenceBoundary).toContain(
      'does not certify the QMS',
    );
  });
});
