import { describe, expect, it } from 'vitest';

import {
  evaluateFinalLegalPublicationGate,
  validateFounderFactsDocument,
} from '../../scripts/compliance/check-final-legal-publication-gate.mjs';
import { generateLegalCounselHandoffBundle } from '../../scripts/compliance/generate-legal-counsel-handoff-bundle.mjs';

const expectedSha = 'd'.repeat(40);
const digest = `sha256:${'e'.repeat(64)}`;
const now = new Date('2026-07-30T18:00:00.000Z');

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
      legalContact: 'legal@example.test',
      privacyContact: 'privacy@example.test',
      securityContact: 'security@example.test',
      billingContact: 'billing@example.test',
      supportContact: 'support@example.test',
      dpoOrRepresentative: notApplicable('No DPO or representative is appointed in this release-gate test fixture.'),
    },
    commercial: {
      productionDomains: ['https://example.test'],
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
    expect(validation.unresolvedFields).toContain('providers.aiProviders');
  });

  it('accepts a structurally complete founder-facts record and explicit N/A only with rationale', () => {
    const complete = completeFounderFacts();
    const accepted = validateFounderFactsDocument(complete, expectedSha, now);
    expect(accepted.accepted).toBe(true);
    expect(accepted.unresolvedFields).toEqual([]);

    const legalEntity = complete.legalEntity as Record<string, unknown>;
    legalEntity.registeredName = {
      status: 'NOT_APPLICABLE',
      rationale: 'short',
    };

    const rejected = validateFounderFactsDocument(complete, expectedSha, now);
    expect(rejected.accepted).toBe(false);
    expect(rejected.unresolvedFields).toContain('legalEntity.registeredName');
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
  });
});
