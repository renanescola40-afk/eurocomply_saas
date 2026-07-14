import { describe, expect, it } from 'vitest';
import {
  STATUS,
  calculateScorecard,
  evaluateEvidenceDocument,
  resolveEvidenceDocuments,
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
    expect(validateConfig({ ...config, controlCount: 99 })).toContain('control count must be 100, received 100');
  });

  it('normalizes complete and passed evidence to PASS', () => {
    expect(evaluateEvidenceDocument({ status: 'Complete', outcome: 'passed' })).toBe(STATUS.PASS);
    expect(evaluateEvidenceDocument({ checks: [{ name: 'build', passed: true }] }, 'build')).toBe(STATUS.PASS);
  });

  it('does not treat Open or missing named checks as success', () => {
    expect(evaluateEvidenceDocument({ status: 'Open' })).toBe(STATUS.NOT_VERIFIED);
    expect(evaluateEvidenceDocument({ checks: [] }, 'build')).toBe(STATUS.NOT_VERIFIED);
  });

  it('prefers configured runtime evidence over repository CI evidence', () => {
    expect(resolveEvidenceDocuments({
      primaryDocument: { status: 'Complete', outcome: 'passed' },
      repositoryDocument: { checks: [{ name: 'build', passed: false }] },
      repositoryCheck: 'build',
    })).toEqual({ status: STATUS.PASS, source: 'configured_evidence' });
  });

  it('uses repository CI only when configured evidence is not verified', () => {
    expect(resolveEvidenceDocuments({
      primaryDocument: null,
      repositoryDocument: { checks: [{ name: 'build', passed: true }] },
      repositoryCheck: 'build',
    })).toEqual({ status: STATUS.PASS, source: 'repository_ci' });
  });

  it('does not hide a configured evidence failure with CI evidence', () => {
    expect(resolveEvidenceDocuments({
      primaryDocument: { status: 'Failed', outcome: 'failed' },
      repositoryDocument: { checks: [{ name: 'build', passed: true }] },
      repositoryCheck: 'build',
    })).toEqual({ status: STATUS.FAIL, source: 'configured_evidence' });
  });

  it('gives PARTIAL half weight and blocks GO when critical evidence is missing', () => {
    let index = 0;
    const scorecard = calculateScorecard(config, () => {
      index += 1;
      if (index <= 50) return { status: STATUS.PASS, reason: 'test', source: 'custom_reader' };
      if (index <= 70) return { status: STATUS.PARTIAL, reason: 'test', source: 'custom_reader' };
      return { status: STATUS.NOT_VERIFIED, reason: 'test', source: 'custom_reader' };
    });
    expect(scorecard.scorePercent).toBe(60);
    expect(scorecard.remainingPercent).toBe(40);
    expect(scorecard.releaseDecision).toBe('NO_GO');
    expect(scorecard.classification).toBe('CONTROLLED_BETA');
  });

  it('passes stable IDs to evidence readers', () => {
    const ids: string[] = [];
    calculateScorecard(config, (_evidence, id) => {
      ids.push(id);
      return { status: STATUS.NOT_VERIFIED, reason: 'test', source: 'custom_reader' };
    });
    expect(ids[0]).toBe('D1-01');
    expect(ids.at(-1)).toBe('D10-10');
  });

  it('permits Enterprise GO only at 100 percent with every critical control PASS', () => {
    const scorecard = calculateScorecard(config, () => ({ status: STATUS.PASS, reason: 'test', source: 'custom_reader' }));
    expect(scorecard.scorePercent).toBe(100);
    expect(scorecard.criticalOpen).toBe(0);
    expect(scorecard.releaseDecision).toBe('GO');
    expect(scorecard.classification).toBe('ENTERPRISE_GO');
    expect(scorecard.publishRecommendation).toBe('ENTERPRISE_PRODUCTION');
  });
});
