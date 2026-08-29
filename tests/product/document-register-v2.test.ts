import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const DOCUMENTS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/documents/page.tsx', import.meta.url);

describe('enterprise document register V2', () => {
  it('preserves no-store, permissions, quotas and signed-download actions', async () => {
    const source = await readFile(DOCUMENTS_PAGE, 'utf8');

    expect(source).toContain("export const dynamic = 'force-dynamic'");
    expect(source).toContain("export const fetchCache = 'force-no-store'");
    expect(source).toContain("roleHasPermission(currentOrganization.role, 'manage_documents')");
    expect(source).toContain('<PlanGate');
    expect(source).toContain('createDocumentSignedDownloadUrl');
    expect(source).toContain('<DocumentDownloadButton');
    expect(source).toContain('<DocumentDeleteButton');
  });

  it('renders live document metadata as a table-first evidence register', async () => {
    const source = await readFile(DOCUMENTS_PAGE, 'utf8');

    expect(source).toContain('<table');
    expect(source).toContain('document.category');
    expect(source).toContain('document.status');
    expect(source).toContain('document.expires_at');
    expect(source).toContain('document.updated_at');
    expect(source).toContain('const approvedDocuments = documents.filter');
    expect(source).toContain('const reviewDocuments = documents.filter');
    expect(source).toContain('const expiringDocuments = documents.filter');
  });
});
