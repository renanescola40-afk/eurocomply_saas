import { describe, expect, it } from 'vitest';

import { getComplianceScoreLabel } from '../../src/lib/dashboard/score';

describe('dashboard score helpers', () => {
  it('returns the strong score label', () => {
    expect(getComplianceScoreLabel(100)).toBe('Strong');
  });
});
