import { describe, expect, it } from 'vitest';
import { buildAiIncidentTriagePlan, parseAiIncidentDetectedAt } from './incidents';

describe('parseAiIncidentDetectedAt', () => {
  const now = new Date('2026-07-14T19:00:00.000Z');

  it('uses the current timestamp only when the field is omitted', () => {
    expect(parseAiIncidentDetectedAt(undefined, now)).toEqual({
      ok: true,
      value: now.toISOString(),
    });
  });

  it('normalizes a valid timestamp', () => {
    expect(parseAiIncidentDetectedAt('2026-07-14T18:30:00+00:00', now)).toEqual({
      ok: true,
      value: '2026-07-14T18:30:00.000Z',
    });
  });

  it('rejects invalid timestamps instead of replacing them with now', () => {
    expect(parseAiIncidentDetectedAt('not-a-date', now)).toEqual({
      ok: false,
      reason: 'invalid_timestamp',
    });
  });

  it('allows bounded clock skew but rejects materially future timestamps', () => {
    expect(parseAiIncidentDetectedAt('2026-07-14T19:04:59.000Z', now).ok).toBe(true);
    expect(parseAiIncidentDetectedAt('2026-07-14T19:05:01.000Z', now)).toEqual({
      ok: false,
      reason: 'future_timestamp',
    });
  });
});

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
