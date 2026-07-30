import { describe, expect, it } from 'vitest';

import { normaliseTruthReport } from '../../scripts/compliance/run-legal-truth-audit.mjs';

function reportWith(status) {
  return {
    inconsistencies: {
      articleRowsGrantingCreditWithoutRequiredHumanReview: [
        {
          article: 'Article 5',
          status,
          evidence: ['docs/compliance/evidence/accepted/legal-rules-qualified-review.json'],
        },
      ],
      closureRequirementsWithoutQualifiedReviewDefinition: [],
    },
    blockers: {
      controlled: [`article_matrix:Article 5:${status}`, 'missing-runtime.json'],
      founderFacts: [],
      human: ['legal-rules'],
      externalOrCustomer: [],
    },
  };
}

describe('canonical legal truth audit runner', () => {
  it('does not confuse technical pending status with human legal acceptance', () => {
    const report = normaliseTruthReport(reportWith('IMPLEMENTED_RUNTIME_PENDING'));

    expect(report.inconsistencies.articleRowsGrantingCreditWithoutRequiredHumanReview).toEqual([]);
    expect(report.blockers.controlled).toEqual(['missing-runtime.json']);
  });

  it('retains a row that grants legal acceptance while qualified evidence is required', () => {
    const report = normaliseTruthReport(reportWith('COUNSEL_ACCEPTED'));

    expect(report.inconsistencies.articleRowsGrantingCreditWithoutRequiredHumanReview).toHaveLength(1);
    expect(report.blockers.controlled).toContain('article_matrix:Article 5:COUNSEL_ACCEPTED');
  });
});
