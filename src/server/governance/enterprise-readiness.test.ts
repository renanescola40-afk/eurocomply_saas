import { describe, expect, it } from 'vitest';
import { calculateWeightedEnterpriseScore, getEnterpriseStatus, type EnterpriseReadinessArea } from './enterprise-readiness';

const area: EnterpriseReadinessArea = {
  id: 'retention',
  label: 'Retention governance',
  score: 80,
  weight: 1,
  status: 'operational',
  nextActions: ['Review retention.'],
};

describe('enterprise readiness', () => {
  it('calculates a weighted score', () => {
    const score = calculateWeightedEnterpriseScore([
      { ...area, score: 100, weight: 2 },
      { ...area, id: 'continuity', label: 'Continuity', score: 50, weight: 1 },
    ]);

    expect(score).toBe(83);
  });

  it('returns expected enterprise status thresholds', () => {
    expect(getEnterpriseStatus(91)).toBe('enterprise_ready');
    expect(getEnterpriseStatus(70)).toBe('operational');
    expect(getEnterpriseStatus(69)).toBe('foundation');
  });

  it('returns zero when no areas exist', () => {
    expect(calculateWeightedEnterpriseScore([])).toBe(0);
  });
});
