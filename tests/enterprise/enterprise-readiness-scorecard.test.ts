import { describe, expect, it } from 'vitest';
import {
  STATUS,
  calculateScorecard,
  evaluateEvidenceDocument,
  validateConfig,
} from '../../scripts/enterprise/generate-readiness-scorecard.mjs';

const control = (title: string, critical = false) => ({
  title,
  critical,
  evidence: { path: `evidence/${title}.json` },
});

const config = {
  schemaVersion: 1,
  controlCount: 100,
  totalWeight: 100,
  domains: Array.from({ length: 10 }, (_, domainIndex) => ({
    id: `domain-${domainIndex + 1}`,
    name: `Domain ${domainIndex + 1}`,
    prefix: `D${domainIndex + 1}`,
    weight: 10,
    controls: Array.from({ length: 10 }, (_, controlIndex) =>
      control(`control-${domainIndex + 1}-${controlIndex + 1}`, controlIndex === 0),
    ),
  })),
};

describe('enterprise readiness scorecard', () => {
  it('requires exactly 100 controls and 100 total weight', () => {
    expect(validateConfig(config)).toEqual([]);
    expect(validateConfig({ ...config, controlCount: 99 })).toContain(
      'control count must be 100, received 100',
    );
  });

  it('normalizes complete and passed evidence to PASS', () => {
    expect(evaluateEvidenceDocument({ status: 'Complete', outcome: 'passed' })).toBe(STATUS.PASS);
    expect(
      evaluateEvidenceDocument({ checks: [{ name: 'build', passed: true }] }, 'build'),
    ).toBe(STATUS.PASS);
  });

  it('does not treat Open or missing named checks as success', () => {
    expect(evaluateEvidenceDocument({ status: 'Open' })).toBe(STATUS.NOT_VERIFIED);
    expect(evaluateEvidenceDocument({ checks: [] }, 'build')).toBe(STATUS.NOT_VERIFIED);
  });

  it('gives PARTIAL half weight and blocks GO when critical evidence is missing', () => {
    let index = 0;
    const scorecard = calculateScorecard(config, () => {
      index += 1;
      if (index <= 50) return { status: STATUS.PASS, reason: 'test' };
      if (index <= 70) return { status: STATUS.PARTIAL, reason: 'test' };
      return { status: STATUS.NOT_VERIFIED, reason: 'test' };
    });

    expect(scorecard.scorePercent).toBe(60);
    expect(scorecard.remainingPercent).toBe(40);
    expect(scorecard.releaseDecision).toBe('NO_GO');
    expect(scorecard.classification).toBe('CONTROLLED_BETA');
  });

  it('permits Enterprise GO only at 100 percent with every critical control PASS', () => {
    const scorecard = calculateScorecard(config, () => ({
      status: STATUS.PASS,
      reason: 'test',
    }));

    expect(scorecard.scorePercent).toBe(100);
    expect(scorecard.criticalOpen).toBe(0);
    expect(scorecard.releaseDecision).toBe('GO');
    expect(scorecard.classification).toBe('ENTERPRISE_GO');
    expect(scorecard.publishRecommendation).toBe('ENTERPRISE_PRODUCTION');
  });
});
