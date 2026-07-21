import { describe, expect, it } from 'vitest';
import {
  decideConformityReadiness,
  type ConformityReadinessInput,
} from './conformity-declaration-registration';

const complete: ConformityReadinessInput = {
  applicability: 'required',
  highRiskSystem: true,
  providerRoleConfirmed: true,
  conformityRoute: 'internal_control',
  routeRationaleRecorded: true,
  qmsApproved: true,
  riskManagementComplete: true,
  dataGovernanceComplete: true,
  technicalDocumentationComplete: true,
  recordKeepingComplete: true,
  transparencyInstructionsComplete: true,
  humanOversightComplete: true,
  accuracyRobustnessCybersecurityComplete: true,
  postMarketPlanApproved: true,
  incidentProcessApproved: true,
  harmonisedStandardsEvidenceReviewed: true,
  commonSpecificationsReviewed: true,
  notifiedBodyRequired: false,
  notifiedBodyEvidenceComplete: false,
  notifiedBodyCertificateValid: false,
  authorisedRepresentativeMandateComplete: true,
  declarationDraftComplete: true,
  declarationRequiredElementsComplete: true,
  declarationSignedByAuthorisedPerson: true,
  ceMarkingApplicabilityReviewed: true,
  ceMarkingControlComplete: true,
  euRegistrationRequired: true,
  euRegistrationDatasetComplete: true,
  euRegistrationSubmitted: true,
  registrationIdentifierRecorded: true,
  substantialModificationReviewed: true,
  openSevereNonconformities: 0,
  expiredCertificates: 0,
  accountableOwnerAssigned: true,
  independentReviewerAssigned: true,
  approverAssigned: true,
  legalReviewComplete: false,
  approvedAt: '2026-07-21T15:00:00Z',
};

describe('decideConformityReadiness', () => {
  it('approves a complete internal-control route', () => {
    const result = decideConformityReadiness(complete);
    expect(result.stage).toBe('approved');
    expect(result.marketReleaseAllowed).toBe(true);
    expect(result.notifiedBodyReviewRequired).toBe(false);
  });

  it('fails closed when applicability or route is uncertain', () => {
    const result = decideConformityReadiness({
      ...complete,
      applicability: 'uncertain',
      conformityRoute: 'uncertain',
      approvedAt: null,
    });
    expect(result.stage).toBe('applicability_review');
    expect(result.legalReviewRequired).toBe(true);
    expect(result.marketReleaseAllowed).toBe(false);
  });

  it('requires notified-body evidence when the route requires it', () => {
    const result = decideConformityReadiness({
      ...complete,
      conformityRoute: 'notified_body',
      notifiedBodyRequired: true,
      notifiedBodyEvidenceComplete: false,
      notifiedBodyCertificateValid: false,
      approvedAt: null,
    });
    expect(result.stage).toBe('external_review');
    expect(result.notifiedBodyReviewRequired).toBe(true);
    expect(result.blockingControlIds).toEqual(
      expect.arrayContaining(['CONF-15', 'CONF-16']),
    );
  });

  it('blocks release for severe nonconformities or expired certificates', () => {
    const result = decideConformityReadiness({
      ...complete,
      conformityRoute: 'notified_body',
      notifiedBodyRequired: true,
      notifiedBodyEvidenceComplete: true,
      notifiedBodyCertificateValid: true,
      openSevereNonconformities: 1,
      expiredCertificates: 1,
    });
    expect(result.stage).toBe('blocked');
    expect(result.marketReleaseAllowed).toBe(false);
    expect(result.blockingControlIds).toEqual(
      expect.arrayContaining(['CONF-27', 'CONF-28']),
    );
  });

  it('stops at declaration readiness before signing', () => {
    const result = decideConformityReadiness({
      ...complete,
      declarationDraftComplete: false,
      declarationRequiredElementsComplete: false,
      declarationSignedByAuthorisedPerson: false,
      approvedAt: null,
    });
    expect(result.stage).toBe('declaration_ready');
    expect(result.missingControlIds).toEqual(
      expect.arrayContaining(['CONF-18', 'CONF-19', 'CONF-20']),
    );
  });

  it('stops at registration readiness when required registration is incomplete', () => {
    const result = decideConformityReadiness({
      ...complete,
      euRegistrationDatasetComplete: false,
      euRegistrationSubmitted: false,
      registrationIdentifierRecorded: false,
      approvedAt: null,
    });
    expect(result.stage).toBe('registration_ready');
    expect(result.marketReleaseAllowed).toBe(false);
  });

  it('never claims an official assessment or CE authorisation', () => {
    const result = decideConformityReadiness(complete);
    expect(result.evidenceBoundary).toContain('does not perform an official conformity assessment');
    expect(result.evidenceBoundary).toContain('authorise CE marking');
  });
});
