import { describe, expect, it } from 'vitest';
import { CONTINUITY_CONTROLS, getContinuityLevel, getContinuityReadinessScore, getContinuitySummary } from './continuity-policy';

describe('continuity policy', () => {
  it('calculates the default readiness summary', () => {
    const summary = getContinuitySummary();

    expect(summary.totalControls).toBe(CONTINUITY_CONTROLS.length);
    expect(summary.readyControls).toBeGreaterThan(0);
    expect(summary.readinessScore).toBeGreaterThanOrEqual(70);
    expect(summary.openCriticalControls).toBeGreaterThanOrEqual(1);
    expect(summary.nextActions.length).toBeGreaterThan(0);
  });

  it('returns enterprise_ready when every control is ready', () => {
    const readyControls = CONTINUITY_CONTROLS.map((control) => ({ ...control, enterpriseReady: true }));
    const score = getContinuityReadinessScore(readyControls);

    expect(score).toBe(100);
    expect(getContinuityLevel(score)).toBe('enterprise_ready');
  });

  it('returns foundation for low readiness', () => {
    const controls = CONTINUITY_CONTROLS.map((control) => ({ ...control, enterpriseReady: false }));

    expect(getContinuityReadinessScore(controls)).toBe(0);
    expect(getContinuityLevel(0)).toBe('foundation');
  });
});
