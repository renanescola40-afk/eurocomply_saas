import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('core release smoke contract', () => {
  it('keeps product routes present for release validation', () => {
    expect(read('src/app/[locale]/ai-systems/page.tsx')).toContain('AiSystemsClient');
    expect(read('src/app/[locale]/dashboard/organizations/activity/page.tsx')).toContain('OrganizationActivityPage');
    expect(read('tests/phase5/dashboard-invariants.test.ts')).toContain('keeps organization activity page protected and data-backed');
    expect(read('tests/phase5/dashboard-invariants.test.ts')).toContain('keeps AI inventory labels covered across public locales');
    expect(read('tests/entity-links-schema.test.ts')).toContain('primary_vendor_id uuid');
    expect(read('tests/ai-inventory-api-contract.test.ts')).toContain('covers detail and reassessment contracts');
  });
});
