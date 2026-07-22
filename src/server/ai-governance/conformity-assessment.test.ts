import { describe, expect, it } from 'vitest';
import { CONFORMITY_STEPS, evaluateConformityAssessment } from './conformity-assessment';

describe('conformity assessment', () => {
  it('blocks release when evidence is incomplete', () => {
    expect(evaluateConformityAssessment([]).releaseAllowed).toBe(false);
  });

  it('allows release only after every required step is approved', () => {
    const records = CONFORMITY_STEPS.map((step) => ({ step, required: true, status: 'approved' as const, evidenceDigest: 'b'.repeat(64), reviewerId: 'reviewer' }));
    expect(evaluateConformityAssessment(records).releaseAllowed).toBe(true);
  });
});
