import { describe, expect, it } from 'vitest';
import {
  buildBoardCommentary,
  buildNextBestActions,
  buildRecommendations,
  buildScorecards,
  getComplianceMaturity,
} from '@/lib/reports/recommendations';

const baseSummary = {
  complianceScore: 82,
  openTasks: 3,
  openRisks: 2,
  criticalRisks: 1,
  highRiskVendors: 1,
  missingDocuments: 2,
  totals: {
    tasks: 10,
    risks: 5,
    vendors: 4,
    documents: 8,
  },
};

describe('report recommendations engine', () => {
  it('maps readiness scores to maturity levels', () => {
    expect(getComplianceMaturity(20).level).toBe('Initial');
    expect(getComplianceMaturity(45).level).toBe('Developing');
    expect(getComplianceMaturity(70).level).toBe('Managed');
    expect(getComplianceMaturity(90).level).toBe('Optimized');
  });

  it('builds scorecards for core compliance areas', () => {
    const scorecards = buildScorecards(baseSummary);

    expect(scorecards.map((scorecard) => scorecard.area)).toEqual(['Documents', 'Vendors', 'Risks', 'Tasks']);
    expect(scorecards.find((scorecard) => scorecard.area === 'Documents')?.score).toBe(75);
    expect(scorecards.find((scorecard) => scorecard.area === 'Tasks')?.score).toBe(70);
  });

  it('orders next best actions by operational priority', () => {
    const actions = buildNextBestActions(baseSummary);

    expect(actions[0]).toContain('critical risks');
    expect(actions[1]).toContain('high-risk vendors');
    expect(actions[2]).toContain('missing compliance documents');
  });

  it('falls back to maintenance action when there are no gaps', () => {
    const actions = buildNextBestActions({
      complianceScore: 100,
      openTasks: 0,
      openRisks: 0,
      criticalRisks: 0,
      highRiskVendors: 0,
      missingDocuments: 0,
      totals: {
        tasks: 5,
        risks: 5,
        vendors: 5,
        documents: 5,
      },
    });

    expect(actions).toEqual(['Maintain the current cadence with monthly evidence, vendor and risk reviews.']);
  });

  it('builds board commentary and recommendations', () => {
    const commentary = buildBoardCommentary(baseSummary);
    const recommendations = buildRecommendations(baseSummary);

    expect(commentary.posture).toContain('optimized');
    expect(commentary.exposure).toContain('critical risks');
    expect(recommendations).toContain('Create mitigation plans with owners and due dates for every critical risk.');
  });
});
