import { describe, expect, it } from 'vitest';

function localStatus(score: number) {
  if (score >= 80) return 'audit_ready';
  if (score >= 40) return 'in_progress';
  return 'starting';
}

describe('audit evidence pack readiness thresholds', () => {
  it('marks low scores as starting', () => {
    expect(localStatus(0)).toBe('starting');
    expect(localStatus(39)).toBe('starting');
  });

  it('marks mid scores as in progress', () => {
    expect(localStatus(40)).toBe('in_progress');
    expect(localStatus(79)).toBe('in_progress');
  });

  it('marks high scores as audit ready', () => {
    expect(localStatus(80)).toBe('audit_ready');
    expect(localStatus(100)).toBe('audit_ready');
  });
});
