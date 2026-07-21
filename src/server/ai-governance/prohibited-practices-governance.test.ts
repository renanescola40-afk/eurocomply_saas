import { describe, expect, it } from 'vitest';

import {
  PROHIBITED_PRACTICE_SIGNALS,
  decideProhibitedPracticesGovernance,
  type ProhibitedPracticeGovernanceInput,
  type ProhibitedPracticeSignalReviewInput,
} from './prohibited-practices';

const clearSignal = (): ProhibitedPracticeSignalReviewInput => ({
  answer: 'no',
  rationaleComplete: true,
  contextDocumented: true,
  evidenceComplete: true,
  reviewerAssigned: true,
  legalConclusion: 'not_prohibited',
});

const completeSignals = Object.fromEntries(
  PROHIBITED_PRACTICE_SIGNALS.map((signal) => [signal, clearSignal()]),
) as ProhibitedPracticeGovernanceInput['signalReviews'];

const complete: ProhibitedPracticeGovernanceInput = {
  applicability: 'required',
  intendedPurposeRecorded: true,
  deploymentContextsRecorded: true,
  affectedPersonsAndGroupsRecorded: true,
  systemCapabilitiesRecorded: true,
  dataSourcesRecorded: true,
  outputsAndConsequencesRecorded: true,
  signalReviews: completeSignals,
  openHighFindings: 0,
  openCriticalFindings: 0,
  accountableOwnerAssigned: true,
  independentReviewerAssigned: true,
  legalReviewerAssigned: false,
  approverAssigned: true,
  reviewDigestValid: true,
  reviewedAt: '2026-07-21T18:30:00.000Z',
  legalReviewedAt: null,
  approvedAt: '2026-07-21T18:45:00.000Z',
  lastMaterialChangeAt: '2026-07-21T18:00:00.000Z',
};

describe('decideProhibitedPracticesGovernance', () => {
  it('approves only a complete independently reviewed clear assessment', () => {
    const result = decideProhibitedPracticesGovernance(complete);

    expect(result.stage).toBe('approved');
    expect(result.productionUseAllowed).toBe(true);
    expect(result.legalReviewRequired).toBe(false);
    expect(result.controls).toHaveLength(26);
    expect(result.missingControlIds).toEqual([]);
    expect(result.prohibitedSignals).toEqual([]);
  });

  it('fails closed when applicability is uncertain', () => {
    const result = decideProhibitedPracticesGovernance({
      ...complete,
      applicability: 'uncertain',
      approvedAt: null,
    });

    expect(result.stage).toBe('applicability_review');
    expect(result.productionUseAllowed).toBe(false);
    expect(result.legalReviewRequired).toBe(true);
    expect(result.missingControlIds).toContain('PPG-01');
  });

  it('blocks when a legal conclusion confirms a prohibited practice', () => {
    const result = decideProhibitedPracticesGovernance({
      ...complete,
      legalReviewerAssigned: true,
      legalReviewedAt: '2026-07-21T18:35:00.000Z',
      signalReviews: {
        ...completeSignals,
        social_scoring: {
          answer: 'yes',
          rationaleComplete: true,
          contextDocumented: true,
          evidenceComplete: true,
          reviewerAssigned: true,
          legalConclusion: 'prohibited',
        },
      },
    });

    expect(result.stage).toBe('blocked');
    expect(result.productionUseAllowed).toBe(false);
    expect(result.prohibitedSignals).toEqual(['social_scoring']);
    expect(result.missingControlIds).toContain('PPG-10');
  });

  it('keeps a positive signal blocked while its legal review is unresolved', () => {
    const result = decideProhibitedPracticesGovernance({
      ...complete,
      approvedAt: null,
      signalReviews: {
        ...completeSignals,
        criminal_risk_prediction: {
          answer: 'yes',
          rationaleComplete: true,
          contextDocumented: true,
          evidenceComplete: true,
          reviewerAssigned: true,
          legalConclusion: 'uncertain',
        },
      },
    });

    expect(result.stage).toBe('blocked');
    expect(result.productionUseAllowed).toBe(false);
    expect(result.positiveSignals).toEqual(['criminal_risk_prediction']);
    expect(result.requiredActions.join(' ')).toContain('legal_conclusion');
  });

  it('accepts a narrowly documented exception only after legal and authorization evidence', () => {
    const result = decideProhibitedPracticesGovernance({
      ...complete,
      legalReviewerAssigned: true,
      legalReviewedAt: '2026-07-21T18:35:00.000Z',
      signalReviews: {
        ...completeSignals,
        emotion_inference_workplace_education: {
          answer: 'yes',
          rationaleComplete: true,
          contextDocumented: true,
          evidenceComplete: true,
          reviewerAssigned: true,
          legalConclusion: 'exception_supported',
          exceptionClaimed: true,
          exceptionBasisComplete: true,
          authorizationComplete: true,
          necessityAndProportionalityComplete: true,
        },
      },
    });

    expect(result.stage).toBe('approved');
    expect(result.productionUseAllowed).toBe(true);
    expect(result.exceptionSupportedSignals).toEqual(['emotion_inference_workplace_education']);
    expect(result.legalReviewRequired).toBe(true);
  });

  it('rejects an exception claim missing authorization or proportionality evidence', () => {
    const result = decideProhibitedPracticesGovernance({
      ...complete,
      approvedAt: null,
      legalReviewerAssigned: true,
      legalReviewedAt: '2026-07-21T18:35:00.000Z',
      signalReviews: {
        ...completeSignals,
        real_time_remote_biometric_public_space: {
          answer: 'yes',
          rationaleComplete: true,
          contextDocumented: true,
          evidenceComplete: true,
          reviewerAssigned: true,
          legalConclusion: 'exception_supported',
          exceptionClaimed: true,
          exceptionBasisComplete: true,
          authorizationComplete: false,
          necessityAndProportionalityComplete: false,
        },
      },
    });

    expect(result.stage).toBe('blocked');
    expect(result.productionUseAllowed).toBe(false);
    expect(result.requiredActions.join(' ')).toContain('authorization');
    expect(result.requiredActions.join(' ')).toContain('necessity_and_proportionality');
  });

  it('invalidates an otherwise complete review after a material change', () => {
    const result = decideProhibitedPracticesGovernance({
      ...complete,
      reviewedAt: '2026-07-21T17:00:00.000Z',
      lastMaterialChangeAt: '2026-07-21T18:00:00.000Z',
    });

    expect(result.stage).toBe('evidence_review');
    expect(result.productionUseAllowed).toBe(false);
    expect(result.missingControlIds).toContain('PPG-16');
  });

  it('requires legal review and approval for a non-applicability decision', () => {
    const pending = decideProhibitedPracticesGovernance({
      ...complete,
      applicability: 'not_required',
      legalReviewerAssigned: false,
      legalReviewedAt: null,
      approvedAt: null,
    });
    expect(pending.stage).toBe('legal_review');

    const accepted = decideProhibitedPracticesGovernance({
      ...complete,
      applicability: 'not_required',
      legalReviewerAssigned: true,
      legalReviewedAt: '2026-07-21T18:35:00.000Z',
    });
    expect(accepted.stage).toBe('not_applicable');
    expect(accepted.productionUseAllowed).toBe(false);
  });
});
