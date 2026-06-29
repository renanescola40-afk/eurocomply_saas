import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const uploadRoute = readFileSync(join(process.cwd(), 'src/app/api/documents/upload/route.ts'), 'utf8');
const downloadAction = readFileSync(join(process.cwd(), 'src/server/actions/document-downloads.ts'), 'utf8');
const uploadScanner = readFileSync(join(process.cwd(), 'scripts/security/check-upload-security.mjs'), 'utf8');

describe('upload/download boundary hardening', () => {
  it('rejects oversized multipart uploads before parsing formData', () => {
    expect(uploadRoute).toContain('MAX_MULTIPART_UPLOAD_BYTES');
    expect(uploadRoute).toContain('rejectOversizedMultipartRequest');
    expect(uploadRoute).toContain("headers.get('content-length')");
    expect(uploadRoute.indexOf('rejectOversizedMultipartRequest(request)')).toBeGreaterThan(-1);
    expect(uploadRoute.indexOf('rejectOversizedMultipartRequest(request)')).toBeLessThan(uploadRoute.indexOf('request.formData()'));
  });

  it('uses the upload rate-limit policy with tenant/user subject fields', () => {
    expect(uploadRoute).toContain("policy: 'upload'");
    expect(uploadRoute).toContain('buildRateLimitSubjectFromRequest');
    expect(uploadRoute).toContain("organizationId: organization.id");
    expect(uploadRoute).toContain("userId: user.id");
    expect(uploadRoute).toContain("route: '/api/documents/upload'");
  });

  it('does not log raw tenant storage paths in successful upload audit metadata', () => {
    expect(uploadRoute).toContain('storagePathRecorded: true');
    expect(uploadRoute).not.toContain('storagePath,\n      name: title');
  });

  it('validates signed URL document IDs and rate limits before storage URL creation', () => {
    expect(downloadAction).toContain('DOCUMENT_ID_PATTERN');
    expect(downloadAction).toContain('isValidDocumentId');
    expect(downloadAction).toContain('invalid_document_id');
    expect(downloadAction).toContain('enforceDocumentUrlRateLimit');
    expect(downloadAction).toContain("policy: 'export'");
    expect(downloadAction.indexOf('isValidDocumentId')).toBeLessThan(downloadAction.indexOf('createSignedUrl'));
    expect(downloadAction.indexOf('enforceDocumentUrlRateLimit')).toBeLessThan(downloadAction.indexOf('createSignedUrl'));
  });

  it('keeps upload security CI enforcing the new boundaries', () => {
    expect(uploadScanner).toContain('rejectOversizedMultipartRequest');
    expect(uploadScanner).toContain('content-length');
    expect(uploadScanner).toContain('DOCUMENT_ID_PATTERN');
    expect(uploadScanner).toContain('invalid_document_id');
    expect(uploadScanner).toContain("policy: 'upload'");
    expect(uploadScanner).toContain("policy: 'export'");
  });
});
