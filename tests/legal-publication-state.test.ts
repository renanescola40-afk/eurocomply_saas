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
    status: 'FOUNDER_FACTS_CONFIRMED',
    productSha,
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
