import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(join(process.cwd(), 'src/app/[locale]/dashboard/fria/page.tsx'), 'utf8');

describe('FRIA neutral assessment creation', () => {
  it('does not inherit regulatory assertions from the currently selected assessment', () => {
    const start = page.indexOf('async function createAssessment()');
    const end = page.indexOf('async function submitEvidence', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const createBlock = page.slice(start, end);
    expect(createBlock).toContain("applicability: 'uncertain'");
    expect(createBlock).toContain('context: {}');
    expect(createBlock).not.toContain('publicAuthorityOrPublicService');
    expect(createBlock).not.toContain('highRiskSystem');
    expect(createBlock).not.toContain('vulnerableGroupsConsidered');
    expect(createBlock).not.toContain('intendedPurpose');
  });
});
