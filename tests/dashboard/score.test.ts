import { describe, expect, it } from 'vitest';

import { getComplianceScoreLabel, getComplianceScoreLevel } from '../../src/lib/dashboard/score';

describe('dashboard score helpers', () => {
  it('classifies critical scores', () => {
    expect(getComplianceScoreLevel(0)).toBe('critical');
    expect(getComplianceScoreLevel(39)).toBe('critical');
    expect(getComplianceScoreLabel(39)).toBe('Critical');
  });

  it('classifies weak scores', () => {
    expect(getComplianceScoreLevel(40)).toBe('weak');
    expect(getComplianceScoreLevel(64)).toBe('weak');
    expect(getComplianceScoreLabel(64)).toBe('Needs attention');
  });

  it('classifies moderate scores', () => {
    expect(getComplianceScoreLevel(65)).toBe('moderate');
    expect(getComplianceScoreLevel(84)).toBe('moderate');
    expect(getComplianceScoreLabel(84)).toBe('Improving');
  });

  it('classifies strong scores', () => {
    expect(getComplianceScoreLevel(85)).toBe('strong');
    expect(getComplianceScoreLevel(100)).toBe('strong');
    expect(getComplianceScoreLabel(100)).toBe('Audit-ready');
  });
});
