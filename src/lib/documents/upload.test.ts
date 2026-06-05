import { describe, expect, it } from 'vitest';
import {
  buildDocumentStoragePath,
  isAllowedDocumentMimeType,
  MAX_DOCUMENT_SIZE_BYTES,
  validateDocumentFile,
} from './upload';

describe('document upload helpers', () => {
  it('allows supported mime types', () => {
    expect(isAllowedDocumentMimeType('application/pdf')).toBe(true);
    expect(isAllowedDocumentMimeType('application/x-msdownload')).toBe(false);
  });

  it('builds organization-scoped storage paths', () => {
    const path = buildDocumentStoragePath({
      organizationId: 'org-1',
      userId: 'user-1',
      fileName: 'Privacy Policy FINAL.pdf',
    });

    expect(path).toContain('org-1/user-1/');
    expect(path).toMatch(/privacy-policy-final\.pdf$/);
  });

  it('rejects unsupported files', () => {
    const file = new File(['x'], 'malware.exe', { type: 'application/x-msdownload' });
    expect(validateDocumentFile(file)).toBe('Unsupported file type.');
  });

  it('rejects files above the size limit', () => {
    const file = new File(['x'], 'report.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: MAX_DOCUMENT_SIZE_BYTES + 1 });

    expect(validateDocumentFile(file)).toBe('File is too large. Maximum size is 10MB.');
  });
});
