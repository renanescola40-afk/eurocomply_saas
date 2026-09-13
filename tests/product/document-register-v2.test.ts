import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const DOCUMENTS_PAGE = new URL('../../src/app/[locale]/dashboard/organizations/documents/page.tsx', import.meta.url);
const DOCUMENTS_QUERY = new URL('../../src/server/queries/documents.ts', import.meta.url);
const DOCUMENT_DOWNLOAD_ACTION = new URL('../../src/server/actions/document-downloads.ts', import.meta.url);

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

  it('never exposes a download action for records without a materialized file', async () => {
    const [pageSource, querySource, actionSource] = await Promise.all([
      readFile(DOCUMENTS_PAGE, 'utf8'),
      readFile(DOCUMENTS_QUERY, 'utf8'),
      readFile(DOCUMENT_DOWNLOAD_ACTION, 'utf8'),
    ]);

    expect(querySource).toContain('storage_path,size_bytes');
    expect(querySource).toContain('download_available: Boolean(storagePath) && (sizeBytes ?? 0) > 0');
    expect(pageSource).toContain('document.download_available ?');
    expect(pageSource).toContain('File not generated yet');
    expect(actionSource).toContain("reason: 'document_file_not_materialized'");
    expect(actionSource).toContain("sizeBytes <= 0 || normalizedStatus === 'draft' || normalizedStatus === 'suggested'");
  });
});
