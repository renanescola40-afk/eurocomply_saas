import { describe, expect, it } from 'vitest';
import { buildAiIncidentTriagePlan } from './incidents';

describe('buildAiIncidentTriagePlan', () => {
  it('escalates critical incidents to urgent review with multiple deadlines', () => {
    const plan = buildAiIncidentTriagePlan({
      severity: 'critical',
      category: 'serious_harm',
      detectedAt: '2026-08-02T10:00:00.000Z',
    });

    expect(plan.recommendedStatus).toBe('assessing');
    expect(plan.escalationLevel).toBe('urgent_review');
    expect(plan.deadlines).toHaveLength(3);
    expect(plan.nextActions.some((action) => action.includes('legal/compliance'))).toBe(true);
  });

  it('routes serious incidents to compliance review', () => {
    const plan = buildAiIncidentTriagePlan({
      severity: 'serious',
      category: 'data_or_security',
      detectedAt: '2026-08-02T10:00:00.000Z',
    });

    expect(plan.recommendedStatus).toBe('assessing');
    expect(plan.escalationLevel).toBe('compliance_review');
    expect(plan.deadlines.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps monitor events in draft watch mode', () => {
    const plan = buildAiIncidentTriagePlan({
      severity: 'monitor',
      category: 'other',
      detectedAt: '2026-08-02T10:00:00.000Z',
    });

    expect(plan.recommendedStatus).toBe('draft');
    expect(plan.escalationLevel).toBe('watch');
    expect(plan.deadlines).toHaveLength(1);
  });
});
