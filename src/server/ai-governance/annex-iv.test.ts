import { describe, expect, it } from 'vitest';
import { ANNEX_IV_SECTIONS, assessAnnexIv } from './annex-iv';

describe('Annex IV completeness', () => {
  it('fails closed when sections are absent', () => {
    const result = assessAnnexIv({});
    expect(result.complete).toBe(false);
    expect(result.completionPercent).toBe(0);
    expect(result.missingSections).toHaveLength(ANNEX_IV_SECTIONS.length);
  });

  it('requires content, evidence, owner and review timestamp for each section', () => {
    const result = assessAnnexIv({
      general_description: {
        summary: 'System description',
        evidenceReferences: ['document:system-card-v1'],
        ownerId: 'owner-1',
      },
    });
    const section = result.sections.find((item) => item.section === 'general_description');
    expect(section?.complete).toBe(false);
    expect(section?.missing).toEqual(['reviewedAt']);
  });

  it('marks the package complete only when all twelve sections are reviewed', () => {
    const input = Object.fromEntries(ANNEX_IV_SECTIONS.map((section) => [section, {
      summary: `Reviewed ${section}`,
      evidenceReferences: [`evidence:${section}`],
      ownerId: 'owner-1',
      reviewedAt: '2026-07-20T00:00:00.000Z',
    }]));
    const result = assessAnnexIv(input);
    expect(result.complete).toBe(true);
    expect(result.completionPercent).toBe(100);
    expect(result.missingSections).toEqual([]);
  });
});
