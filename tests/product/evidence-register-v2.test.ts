import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const EVIDENCE_PAGE = new URL('../../src/app/[locale]/dashboard/evidence/page.tsx', import.meta.url);

describe('enterprise evidence register V2', () => {
  it('preserves tenant resolution, evidence storage and live summary logic', async () => {
    const source = await readFile(EVIDENCE_PAGE, 'utf8');

    expect(source).toContain('resolveEvidenceOrganization');
    expect(source).toContain('tryListEvidenceItems');
    expect(source).toContain('createEvidenceItem');
    expect(source).toContain('summarizeEvidence');
    expect(source).toContain('requestedOrganizationId');
    expect(source).toContain('setTenantError');
    expect(source).toContain("status: 'draft'");
  });

  it('renders live evidence as a table-first enterprise register', async () => {
    const source = await readFile(EVIDENCE_PAGE, 'utf8');

    expect(source).toContain('<table');
    expect(source).toContain('item.evidence_type');
    expect(source).toContain('item.owner_name');
    expect(source).toContain('item.article_refs');
    expect(source).toContain('item.status');
    expect(source).toContain('summary.coverage');
    expect(source).toContain('summary.valid');
    expect(source).toContain('summary.needsReview');
    expect(source).toContain('summary.expired');
    expect(source).not.toContain("value: '87%'");
    expect(source).not.toContain("value: '92%'");
  });
});
