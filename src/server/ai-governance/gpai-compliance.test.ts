import { describe, expect, it } from 'vitest';
import { GPAI_OBLIGATIONS, evaluateGpaiCompliance } from './gpai-compliance';

describe('GPAI compliance', () => {
  it('fails closed for an EU GPAI profile without records', () => {
    expect(evaluateGpaiCompliance({ systemicRisk: true, openSource: false, placedOnEuMarket: true }, []).complete).toBe(false);
  });

  it('passes a fully evidenced systemic-risk profile', () => {
    const records = GPAI_OBLIGATIONS.map((obligation) => ({ obligation, applicable: true, status: 'approved' as const, evidenceDigest: 'c'.repeat(64), accountableOwnerId: 'owner' }));
    expect(evaluateGpaiCompliance({ systemicRisk: true, openSource: false, placedOnEuMarket: true }, records).complete).toBe(true);
  });
});
