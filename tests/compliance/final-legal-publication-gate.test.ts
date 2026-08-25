import { describe, expect, it } from 'vitest';

import {
  evaluateFinalLegalPublicationGate,
  validateFounderFactsDocument,
  validateMasterDecisionDocument,
  validateQualifiedReviewDocument,
} from '../../scripts/compliance/check-final-legal-publication-gate.mjs';
import { generateLegalCounselHandoffBundle } from '../../scripts/compliance/generate-legal-counsel-handoff-bundle.mjs';

const expectedSha = 'd'.repeat(40);
const digest = `sha256:${'e'.repeat(64)}`;
const now = new Date('2026-07-30T18:00:00.000Z');
const reviewIds = [
  'legal-rules',
  'prohibited-practices',
  'article-50-copy',
  'fria-methodology',
  'deployer-obligations',
  'high-risk-provider',
  'conformity',
  'gpai',
];
const reviewRequirement = {
  id: 'legal-rules',
  path: 'docs/compliance/evidence/accepted/legal-rules-qualified-review.json',
};

function notApplicable(rationale: string): Record<string, string> {
  return { status: 'NOT_APPLICABLE', rationale };
}

function completeFounderFacts(): Record<string, unknown> {
  return {
    schema: 'risck-comply.founder-facts.v1',
    status: 'FOUNDER_FACTS_CONFIRMED',
    productSha: expectedSha,
    legalEntity: {
      registeredName: notApplicable('No registered entity exists in this release-gate test fixture.'),
      companyNumber: notApplicable('No company number exists in this release-gate test fixture.'),
      vatNumber: notApplicable('No VAT number exists in this release-gate test fixture.'),
      registeredAddress: notApplicable('No registered office exists in this release-gate test fixture.'),
      country: 'Portugal',
      governingLawPreference: 'Portuguese law preference recorded for qualified counsel review.',
      legalContact: 'legal@example.test',
      privacyContact: 'privacy@example.test',
      securityContact: 'security@example.test',
      billingContact: 'billing@example.test',
      supportContact: 'support@example.test',
      dpoOrRepresentative: notApplicable('No DPO or representative is appointed in this release-gate test fixture.'),
    },
    commercial: {
      productionProductName: 'Risck Comply',
      productionDomains: ['https://example.test'],
      customerTypesAndExcludedUses: 'B2B customers; prohibited and unsupported uses are excluded.',
      plansAndBilling: 'Resolved plan and billing terms.',
      trialRenewalCancellation: 'Resolved trial, renewal and cancellation terms.',
      refundSuspensionTermination: 'Resolved refund, suspension and termination terms.',
      enterpriseOrderForm: notApplicable('No enterprise order form applies in this release-gate test fixture.'),
      slaCommitments: notApplicable('No contractual SLA applies in this release-gate test fixture.'),
    },
    dataProcessing: {
      productionDataCategories: ['account metadata', 'customer content'],
      roleAllocation: 'Resolved controller and processor allocation.',
      hostingRegions: ['EU'],
      retentionSchedule: 'Resolved retention schedule.',
      transferMechanisms: 'Resolved transfer treatment.',
      dataSubjectRequestOwner: 'privacy@example.test',
    },
    providers: {
      hosting: 'Resolved hosting facts.',
      databaseAndAuth: 'Resolved database and authentication facts.',
      billing: 'Resolved billing facts.',
      observability: 'Resolved observability facts.',
      analytics: 'Resolved analytics facts.',
      email: 'Resolved email facts.',
      support: 'Resolved support facts.',
      aiProviders: notApplicable('No AI provider processes customer content in this release-gate test fixture.'),
    },
    securityOperations: {
      availabilityCommitment: 'Resolved availability commitment.',
      supportCommitment: 'Resolved support commitment.',
      incidentCommunication: 'Resolved incident communication process.',
      backupRestoreCommitment: 'Resolved backup and restore commitment.',
      certificationsAuditsPentests: notApplicable('No external certification or pentest is claimed in this release-gate test fixture.'),
      vulnerabilityDisclosureProcess: 'Security reports are handled through the designated disclosure process.',
    },
    aiLegalPositioning: {
      serviceBoundaryConfirmed: true,
      customerContentAiProcessing: false,
      excludedUses: ['prohibited uses'],
      partnerCounselModel: notApplicable('No partner-counsel model applies in this release-gate test fixture.'),
      approvedClaims: ['compliance operations support'],
    },
    authorisedOfficer: {
      name: 'Authorised Officer',
      role: 'Director',
      confirmedAt: '2026-07-30T12:00:00.000Z',
      signedArtifactReference: 'confidential://signed/founder-facts.pdf',
      factsDigest: digest,
    },
  };
}

function completeQualifiedReview(): Record<string, unknown> {
  return {
    schema: 'risck-comply.qualified-review-decision.v1',
    status: 'COUNSEL_ACCEPTED',
    reviewPackageId: reviewRequirement.id,
    reviewerName: 'Qualified Reviewer',
    professionalRegistration: 'PT-12345',
    jurisdiction: 'Portugal',
    qualificationScope: 'EU AI Act and technology law',
    conflictAssessment: 'No disqualifying conflict identified for the stated scope.',
    independenceDeclaration: 'Independent professional judgment was exercised.',
    reviewScope: 'Versioned legal-rules workstream and bound evidence package.',
    productSha: expectedSha,
    evidencePackageDigest: digest,
    decision: 'ACCEPTED',
    validityStart: '2026-07-01T00:00:00.000Z',
    validityEnd: '2027-07-01T00:00:00.000Z',
    signedArtifactReference: 'confidential://signed/legal-rules.pdf',
    decisionDigest: digest,
    timestamp: '2026-07-30T12:00:00.000Z',
  };
}

function completeMasterDecision(): Record<string, unknown> {
  return {
    schema: 'risck-comply.master-legal-decision-sheet.v1',
    decision: 'COUNSEL_ACCEPTED',
    reviewer: {
      name: 'Qualified Reviewer',
      professionalRegistration: 'PT-12345',
      jurisdiction: 'Portugal',
      qualificationScope: 'EU AI Act, privacy and technology law',
      conflictAssessment: 'No disqualifying conflict identified for the stated scope.',
      independenceDeclaration: 'Independent professional judgment was exercised.',
    },
    reviewBinding: {
      productSha: expectedSha,
      evidencePackageDigest: digest,
      signedOpinionReference: 'confidential://signed/master-opinion.pdf',
      decisionDigest: digest,
      reviewedAt: '2026-07-30T12:00:00.000Z',
      validityStart: '2026-07-01T00:00:00.000Z',
      validityEnd: '2027-07-01T00:00:00.000Z',
      changeTriggers: ['Material product, provider, contract or legal-source change requires re-review.'],
    },
    globalDecisions: {
      intendedPurpose: 'COUNSEL_ACCEPTED',
      productRole: 'COUNSEL_ACCEPTED',
      launchPosition: 'COUNSEL_ACCEPTED',
      contractPack: 'COUNSEL_ACCEPTED',
      privacyAndDpa: 'COUNSEL_ACCEPTED',
      claims: 'COUNSEL_ACCEPTED',
      partnerCounselModel: 'COUNSEL_ACCEPTED',
    },
    workstreamDecisions: reviewIds.map((id) => ({
      id,
      decision: 'COUNSEL_ACCEPTED',
      findings: [],
      conditions: [],
    })),
    externalDependencies: [],
    blockingChanges: [],
    nonBlockingRecommendations: [],
    permittedReliance: 'Reliance is limited to the exact reviewed release, scope and validity period.',
    limitations: ['Customer-specific advice and formal conformity assessment remain outside the stated scope.'],
  };
}

describe('final legal publication gate', () => {
  it('passes repository preparation while truthfully blocking final publication', () => {
    const report = evaluateFinalLegalPublicationGate({
      root: process.cwd(),
      expectedSha,
      now,
    });

    expect(report.repositoryPreparation.ready).toBe(true);
    expect(report.repositoryPreparation.reviewPackageStatus).toBe('READY_FOR_QUALIFIED_REVIEW');
    expect(report.repositoryPreparation.contractPackStatus).toBe('READY_FOR_FOUNDER_AND_COUNSEL_HANDOFF');
    expect(report.publishFinalLegalDocuments).toBe(false);
    expect(report.publicSurfaceMode).toBe('INFORMATIONAL_REVIEW_DRAFT');
    expect(report.publicationStatus).toBe('FOUNDER_FACT_REQUIRED');
    expect(report.humanAndExternalEvidence.founderFactsAccepted).toBe(false);
    expect(report.humanAndExternalEvidence.qualifiedReviewAcceptedCount).toBe(0);
    expect(report.humanAndExternalEvidence.masterDecisionAccepted).toBe(false);
    expect(report.blockers).toContain('founder_facts:missing');
    expect(report.blockers).toContain('qualified_reviews:0/8');
    expect(report.blockers).toContain('master_decision:missing');
  });

  it('rejects a signed founder-facts envelope that omits required factual sections', () => {
    const validation = validateFounderFactsDocument(
      {
        schema: 'risck-comply.founder-facts.v1',
        status: 'FOUNDER_FACTS_CONFIRMED',
        productSha: expectedSha,
        authorisedOfficer: {
          name: 'Authorised Officer',
          role: 'Director',
          confirmedAt: '2026-07-30T12:00:00.000Z',
          signedArtifactReference: 'confidential://signed/founder-facts.pdf',
          factsDigest: digest,
        },
      },
      expectedSha,
      now,
    );

    expect(validation.accepted).toBe(false);
    expect(validation.officerComplete).toBe(true);
    expect(validation.unresolvedFields).toContain('legalEntity.registeredName');
    expect(validation.unresolvedFields).toContain('commercial.productionProductName');
    expect(validation.unresolvedFields).toContain('providers.aiProviders');
    expect(validation.unresolvedFields).toContain('securityOperations.vulnerabilityDisclosureProcess');
  });

  it('accepts a structurally complete founder-facts record and rejects unstructured N/A', () => {
    const complete = completeFounderFacts();
    const accepted = validateFounderFactsDocument(complete, expectedSha, now);
    expect(accepted.accepted).toBe(true);
    expect(accepted.unresolvedFields).toEqual([]);

    const legalEntity = complete.legalEntity as Record<string, unknown>;
    legalEntity.registeredName = 'NOT_APPLICABLE';
    const unstructured = validateFounderFactsDocument(complete, expectedSha, now);
    expect(unstructured.accepted).toBe(false);
    expect(unstructured.unresolvedFields).toContain('legalEntity.registeredName');

    legalEntity.registeredName = {
      status: 'NOT_APPLICABLE',
      rationale: 'short',
    };
    const shortRationale = validateFounderFactsDocument(complete, expectedSha, now);
    expect(shortRationale.accepted).toBe(false);
    expect(shortRationale.unresolvedFields).toContain('legalEntity.registeredName');
  });

  it('requires exact qualified-review identity, final acceptance and immutable digests', () => {
    const complete = completeQualifiedReview();
    expect(validateQualifiedReviewDocument(complete, reviewRequirement, expectedSha, now).accepted).toBe(true);

    const conditional = { ...complete, decision: 'ACCEPTED_WITH_CHANGES' };
    const conditionalResult = validateQualifiedReviewDocument(
      conditional,
      reviewRequirement,
      expectedSha,
      now,
    );
    expect(conditionalResult.accepted).toBe(false);
    expect(conditionalResult.failures).toContain('decision_not_accepted');

    const wrongPackage = { ...complete, reviewPackageId: 'gpai' };
    expect(
      validateQualifiedReviewDocument(wrongPackage, reviewRequirement, expectedSha, now).failures,
    ).toContain('review_package_id_mismatch');
  });

  it('requires unique canonical workstreams and zero blocking changes in the master decision', () => {
    const complete = completeMasterDecision();
    expect(validateMasterDecisionDocument(complete, expectedSha, now).accepted).toBe(true);

    const duplicateWorkstreams = {
      ...complete,
      workstreamDecisions: reviewIds.map(() => ({
        id: 'legal-rules',
        decision: 'COUNSEL_ACCEPTED',
        findings: [],
        conditions: [],
      })),
    };
    const duplicateResult = validateMasterDecisionDocument(duplicateWorkstreams, expectedSha, now);
    expect(duplicateResult.accepted).toBe(false);
    expect(duplicateResult.failures).toContain('workstream_ids_invalid');

    const blocked = { ...complete, blockingChanges: ['Required contract remediation remains open.'] };
    const blockedResult = validateMasterDecisionDocument(blocked, expectedSha, now);
    expect(blockedResult.accepted).toBe(false);
    expect(blockedResult.failures).toContain('blocking_changes_present');
  });

  it('generates a deterministic counsel bundle without embedding signed decisions', () => {
    const bundle = generateLegalCounselHandoffBundle({
      root: process.cwd(),
      sourceSha: expectedSha,
      generatedAt: now,
    });

    expect(bundle.preparationStatus).toBe('READY_FOR_COUNSEL_HANDOFF');
    expect(bundle.legalAcceptanceStatus).toBe('HUMAN_REVIEW_REQUIRED');
    expect(bundle.missingPreparationPaths).toEqual([]);
    expect(bundle.fileCount).toBeGreaterThan(30);
    expect(bundle.packageDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(bundle.externalDecisionStatus).toHaveLength(10);
    expect(bundle.externalDecisionStatus.every((item) => item.includedInBundle === false)).toBe(true);
    expect(bundle.files.some((file) => file.path.includes('/evidence/accepted/'))).toBe(false);

    const bundledPaths = new Set(bundle.files.map((file) => file.path));
    expect(bundledPaths).toContain(
      'docs/legal-review-preparation/free-counsel/FREE_COUNSEL_REVIEW_PACK.md',
    );
    expect(bundledPaths).toContain(
      'docs/legal-review-preparation/free-counsel/AI_OFFICE_8_QUESTION_SUBMISSION.md',
    );
    expect(bundledPaths).toContain(
      'docs/legal-review-preparation/free-counsel/QUALIFIED_REVIEW_RESPONSE_TEMPLATE.md',
    );
    expect(
      bundle.files
        .filter((file) => file.path.includes('/free-counsel/'))
        .every((file) => file.class === 'FREE_COUNSEL_REVIEW_HANDOFF'),
    ).toBe(true);
  });
});
