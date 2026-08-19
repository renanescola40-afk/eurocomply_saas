import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  evaluateLegalPublicationState,
  QUALIFIED_REVIEW_DECISION_PATHS,
  type LegalPublicationArtifact,
} from '@/server/legal/legal-publication-state';

const expectedSha = 'a'.repeat(40);
const digest = `sha256:${'b'.repeat(64)}`;
const now = new Date('2026-07-30T18:00:00.000Z');

function artifact(path: string, document: Record<string, unknown>): LegalPublicationArtifact {
  return { path, document };
}

function notApplicable(rationale: string): Record<string, string> {
  return { status: 'NOT_APPLICABLE', rationale };
}

function qualifiedReview(path: string, productSha = expectedSha): LegalPublicationArtifact {
  return artifact(path, {
    status: 'COUNSEL_ACCEPTED',
    reviewerName: 'Qualified Reviewer',
    professionalRegistration: 'verified-registration',
    jurisdiction: 'EU member state',
    qualificationScope: 'EU technology and AI law',
    conflictAssessment: 'No disqualifying conflict identified.',
    independenceDeclaration: 'Independent professional judgment exercised.',
    productSha,
    evidencePackageDigest: digest,
    signedArtifactReference: 'confidential://signed/review.pdf',
    decisionDigest: digest,
    validityStart: '2026-07-30T00:00:00.000Z',
    validityEnd: '2027-07-30T00:00:00.000Z',
  });
}

function founderFacts(productSha = expectedSha): LegalPublicationArtifact {
  return artifact('docs/compliance/evidence/accepted/founder-facts.json', {
    schema: 'risck-comply.founder-facts.v1',
    status: 'FOUNDER_FACTS_CONFIRMED',
    productSha,
    legalEntity: {
      registeredName: notApplicable('No registered entity exists in this test fixture operating model.'),
      companyNumber: notApplicable('No company number exists in this test fixture operating model.'),
      vatNumber: notApplicable('No VAT number exists in this test fixture operating model.'),
      registeredAddress: notApplicable('No registered office exists in this test fixture operating model.'),
      country: 'Portugal',
      legalContact: 'legal@example.test',
      privacyContact: 'privacy@example.test',
      securityContact: 'security@example.test',
      billingContact: 'billing@example.test',
      supportContact: 'support@example.test',
      dpoOrRepresentative: notApplicable('No DPO or representative is appointed in this test fixture.'),
    },
    commercial: {
      productionDomains: ['https://example.test'],
      plansAndBilling: 'Resolved plan and billing terms.',
      trialRenewalCancellation: 'Resolved trial, renewal and cancellation terms.',
      refundSuspensionTermination: 'Resolved refund, suspension and termination terms.',
      enterpriseOrderForm: notApplicable('No negotiated enterprise order form applies in this test fixture.'),
      slaCommitments: notApplicable('No contractual SLA applies in this test fixture.'),
    },
    dataProcessing: {
      productionDataCategories: ['account metadata', 'customer content'],
      roleAllocation: 'Resolved controller and processor allocation.',
      hostingRegions: ['EU'],
      retentionSchedule: 'Resolved retention schedule.',
      transferMechanisms: 'Resolved provider transfer treatment.',
      dataSubjectRequestOwner: 'privacy@example.test',
    },
    providers: {
      hosting: 'Resolved hosting provider facts.',
      databaseAndAuth: 'Resolved database and auth provider facts.',
      billing: 'Resolved billing provider facts.',
      observability: 'Resolved observability provider facts.',
      analytics: 'Resolved analytics provider facts.',
      email: 'Resolved email provider facts.',
      support: 'Resolved support provider facts.',
      aiProviders: notApplicable('No AI provider processes customer content in this test fixture.'),
    },
    securityOperations: {
      availabilityCommitment: 'Resolved availability commitment.',
      supportCommitment: 'Resolved support commitment.',
      incidentCommunication: 'Resolved incident communication process.',
      backupRestoreCommitment: 'Resolved backup and restore commitment.',
      certificationsAuditsPentests: notApplicable('No external certification or pentest is claimed in this test fixture.'),
    },
    aiLegalPositioning: {
      serviceBoundaryConfirmed: true,
      customerContentAiProcessing: false,
      excludedUses: ['prohibited uses'],
      partnerCounselModel: notApplicable('No partner-counsel referral model applies in this test fixture.'),
      approvedClaims: ['compliance operations support'],
    },
    authorisedOfficer: {
      name: 'Authorised Officer',
      role: 'Director',
      confirmedAt: '2026-07-30T12:00:00.000Z',
      signedArtifactReference: 'confidential://signed/founder-facts.pdf',
      factsDigest: digest,
    },
  });
}

function masterDecision(productSha = expectedSha): LegalPublicationArtifact {
  return artifact('docs/compliance/evidence/accepted/master-legal-decision.json', {
    decision: 'COUNSEL_ACCEPTED',
    reviewer: {
      name: 'Qualified Reviewer',
      professionalRegistration: 'verified-registration',
      jurisdiction: 'EU member state',
      qualificationScope: 'EU technology and AI law',
      conflictAssessment: 'No disqualifying conflict identified.',
      independenceDeclaration: 'Independent professional judgment exercised.',
    },
    reviewBinding: {
      productSha,
      evidencePackageDigest: digest,
      signedOpinionReference: 'confidential://signed/master-opinion.pdf',
      decisionDigest: digest,
      reviewedAt: '2026-07-30T12:00:00.000Z',
      validityStart: '2026-07-30T00:00:00.000Z',
      validityEnd: '2027-07-30T00:00:00.000Z',
    },
    workstreamDecisions: QUALIFIED_REVIEW_DECISION_PATHS.map((path) => ({
      id: path,
      decision: 'COUNSEL_ACCEPTED',
    })),
  });
}

describe('legal publication state', () => {
  it('fails closed when accepted human evidence is absent', () => {
    const state = evaluateLegalPublicationState({
      expectedSha,
      now,
      founderFacts: { path: 'founder-facts.json', document: null, error: 'missing' },
      qualifiedReviews: QUALIFIED_REVIEW_DECISION_PATHS.map((path) => ({
        path,
        document: null,
        error: 'missing' as const,
      })),
      masterDecision: { path: 'master-decision.json', document: null, error: 'missing' },
    });

    expect(state.status).toBe('FOUNDER_FACT_REQUIRED');
    expect(state.accepted).toBe(false);
    expect(state.qualifiedReviewsAccepted).toBe(0);
    expect(state.masterDecisionAccepted).toBe(false);
    expect(state.notice).toContain('informational review drafts');
  });

  it('rejects a signed envelope when required founder facts remain unresolved', () => {
    const state = evaluateLegalPublicationState({
      expectedSha,
      now,
      founderFacts: artifact('docs/compliance/evidence/accepted/founder-facts.json', {
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
      }),
      qualifiedReviews: QUALIFIED_REVIEW_DECISION_PATHS.map((path) => qualifiedReview(path)),
      masterDecision: masterDecision(),
    });

    expect(state.status).toBe('FOUNDER_FACT_REQUIRED');
    expect(state.accepted).toBe(false);
    expect(state.founderFactsAccepted).toBe(false);
    expect(state.blockers).toContain('founder_facts_not_accepted');
  });

  it('accepts only complete evidence bound to the exact SHA', () => {
    const state = evaluateLegalPublicationState({
      expectedSha,
      now,
      founderFacts: founderFacts(),
      qualifiedReviews: QUALIFIED_REVIEW_DECISION_PATHS.map((path) => qualifiedReview(path)),
      masterDecision: masterDecision(),
    });

    expect(state.status).toBe('COUNSEL_ACCEPTED');
    expect(state.accepted).toBe(true);
    expect(state.founderFactsAccepted).toBe(true);
    expect(state.qualifiedReviewsAccepted).toBe(8);
    expect(state.masterDecisionAccepted).toBe(true);
    expect(state.blockers).toEqual([]);
  });

  it('rejects a master decision for another product SHA', () => {
    const state = evaluateLegalPublicationState({
      expectedSha,
      now,
      founderFacts: founderFacts(),
      qualifiedReviews: QUALIFIED_REVIEW_DECISION_PATHS.map((path) => qualifiedReview(path)),
      masterDecision: masterDecision('c'.repeat(40)),
    });

    expect(state.status).toBe('HUMAN_REVIEW_REQUIRED');
    expect(state.accepted).toBe(false);
    expect(state.blockers).toContain('master_legal_decision_not_accepted');
  });

  it('surfaces the fail-closed status on the public Trust Center', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/marketing/trust-center-page.tsx'),
      'utf8',
    );

    expect(source).toContain('getLegalPublicationState');
    expect(source).toContain('{legalPublication.label}');
    expect(source).toContain('{legalPublication.notice}');
  });
});
