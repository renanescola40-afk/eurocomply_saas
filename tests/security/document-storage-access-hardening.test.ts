import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const uploadRoute = readFileSync(join(process.cwd(), 'src/app/api/documents/upload/route.ts'), 'utf8');
const downloadAction = readFileSync(join(process.cwd(), 'src/server/actions/document-downloads.ts'), 'utf8');

describe('document storage access hardening invariants', () => {
  it('bounds multipart uploads before parsing formData', () => {
    expect(uploadRoute).toMatch(/MAX_(UPLOAD_REQUEST|MULTIPART_UPLOAD)_BYTES/);
    expect(uploadRoute).toContain('content-length');
    expect(uploadRoute).toContain('isMultipartRequestTooLarge');
    expect(uploadRoute.indexOf('isMultipartRequestTooLarge')).toBeLessThan(uploadRoute.indexOf('request.formData()'));
    expect(uploadRoute).toContain("reason: 'request_body_too_large'");
    expect(uploadRoute).toContain('{ status: 413 }');
  });

  it('uses upload-specific fail-closed rate limiting before storage side effects', () => {
    expect(uploadRoute).toContain("policy: 'upload'");
    expect(uploadRoute).toContain("failureMode: 'fail-closed'");
    expect(uploadRoute).toMatch(/action: 'documents?_upload'/);
    expect(uploadRoute).toContain("route: '/api/documents/upload'");
    expect(uploadRoute.indexOf('checkDistributedRateLimit')).toBeLessThan(uploadRoute.indexOf('request.formData()'));
    expect(uploadRoute.indexOf('shouldBlockUploadForMalwareScan')).toBeLessThan(uploadRoute.indexOf('.upload(storagePath'));
  });

  it('validates signed URL document ids before tenant-scoped lookup', () => {
    expect(downloadAction).toContain('DOCUMENT_ID_PATTERN');
    expect(downloadAction).toContain('normalizeDocumentId');
    expect(downloadAction).toContain('invalid_document_id');
    expect(downloadAction).toContain(".eq('id', safeDocumentId)");
    expect(downloadAction).not.toContain(".eq('id', documentId)");
  });

  it('does not attribute unresolved or cross-tenant lookup denials to an arbitrary membership', () => {
    const unresolvedDenialStart = downloadAction.indexOf("reason: 'document_not_found_or_cross_tenant'");
    const unresolvedDenialEnd = downloadAction.indexOf('throw actionError(\'Document not found\')', unresolvedDenialStart);
    const unresolvedDenial = downloadAction.slice(unresolvedDenialStart, unresolvedDenialEnd);

    expect(unresolvedDenialStart).toBeGreaterThan(-1);
    expect(unresolvedDenial).toContain('organizationId: null');
    expect(unresolvedDenial).not.toContain('organizationIds[0]');
  });

  it('rate limits signed URL creation and validates tenant path before URL creation', () => {
    expect(downloadAction).toContain('checkDistributedRateLimit');
    expect(downloadAction).toContain("policy: 'export'");
    expect(downloadAction).toContain("failureMode: 'fail-closed'");
    expect(downloadAction).toContain('Too many document access requests');
    expect(downloadAction.indexOf('assertTenantStoragePathInOrganization')).toBeLessThan(downloadAction.indexOf('createSignedUrl'));
  });

  it('does not write raw storage paths into error log contexts', () => {
    expect(downloadAction).not.toContain('reportError(error, { ...context, organizationId: document.organization_id, storagePath: document.storage_path })');
    expect(downloadAction).toContain('hasStoragePath: Boolean(document.storage_path)');
  });
});
