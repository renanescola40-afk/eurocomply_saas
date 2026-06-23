import { describe, expect, it } from 'vitest';
import {
  calculateVendorAssuranceScore,
  getVendorAssuranceStatus,
  getVendorAssuranceSummary,
  type VendorAssuranceControl,
} from './vendor-assurance-policy';

const baseControl: VendorAssuranceControl = {
  id: 'cloud_hosting',
  provider: 'Example',
  purpose: 'Example purpose',
  criticality: 'critical',
  reviewCadence: 'quarterly',
  evidence: ['status page'],
  status: 'ready',
  nextAction: 'Keep evidence current.',
};

describe('vendor assurance policy', () => {
  it('calculates enterprise-ready status when controls are ready', () => {
    const controls: VendorAssuranceControl[] = [
      { ...baseControl, status: 'ready' },
      { ...baseControl, id: 'database_platform', criticality: 'high', status: 'ready' },
      { ...baseControl, id: 'payments', criticality: 'medium', status: 'ready' },
    ];

    const score = calculateVendorAssuranceScore(controls);

    expect(score).toBe(100);
    expect(getVendorAssuranceStatus(score)).toBe('enterprise_ready');
  });

  it('summarises controls that still need review', () => {
    const controls: VendorAssuranceControl[] = [
      { ...baseControl, status: 'tracked' },
      { ...baseControl, id: 'monitoring', criticality: 'high', status: 'needs_review', nextAction: 'Review monitoring setup.' },
    ];

    const summary = getVendorAssuranceSummary(controls);

    expect(summary.totalControls).toBe(2);
    expect(summary.trackedControls).toBe(1);
    expect(summary.needsReview).toBe(1);
    expect(summary.nextActions).toContain('Keep evidence current.');
    expect(summary.nextActions).toContain('Review monitoring setup.');
  });

  it('returns foundation score when there are no controls', () => {
    expect(calculateVendorAssuranceScore([])).toBe(0);
    expect(getVendorAssuranceSummary([]).status).toBe('foundation');
  });
});
