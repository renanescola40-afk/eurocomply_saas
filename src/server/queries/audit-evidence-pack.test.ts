import { describe, expect, it } from 'vitest';
import { calculateEvidencePackScore, getEvidencePackStatus } from './audit-evidence-pack';

describe('audit evidence pack readiness thresholds', () => {
  it('marks low scores as starting', () => {
    expect(getEvidencePackStatus(0)).toBe('starting');
    expect(getEvidencePackStatus(39)).toBe('starting');
  });

  it('marks mid scores as in progress', () => {
    expect(getEvidencePackStatus(40)).toBe('in_progress');
    expect(getEvidencePackStatus(79)).toBe('in_progress');
  });

  it('marks high scores as audit ready', () => {
    expect(getEvidencePackStatus(80)).toBe('audit_ready');
    expect(getEvidencePackStatus(100)).toBe('audit_ready');
  });

  it('calculates score from populated evidence categories', () => {
    const score = calculateEvidencePackScore({
      documents: [{ status: 'approved' }],
      vendors: [{ risk_level: 'low' }],
      risks: [{ status: 'open' }],
      aiSystems: [{ risk_level: 'limited_transparency' }] as never,
      aiIncidents: [{ report_status: 'closed' }] as never,
      auditEvents: [{ event_type: 'test' }] as never,
    });

    expect(score).toBeGreaterThanOrEqual(90);
  });
});
