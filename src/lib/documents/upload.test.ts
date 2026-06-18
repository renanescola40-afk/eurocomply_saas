import { describe, expect, it, vi } from 'vitest';
import {
  buildDocumentStoragePath,
  isAllowedDocumentMimeType,
  MAX_DOCUMENT_SIZE_BYTES,
  sanitizeDocumentDownloadFileName,
  sanitizeDocumentStorageFileName,
  validateDocumentFile,
} from './upload';

describe('document upload helpers', () => {
  it('allows supported mime types', () => {
    expect(isAllowedDocumentMimeType('application/pdf')).toBe(true);
    expect(isAllowedDocumentMimeType('application/x-msdownload')).toBe(false);
  });

  it('builds organization-scoped storage paths', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const path = buildDocumentStoragePath({
      organizationId: 'org-1',
      userId: 'user-1',
      fileName: 'Privacy Policy FINAL.pdf',
    });

    expect(path).toBe('org-1/user-1/1700000000000-privacy-policy-final.pdf');
  });

  it('sanitizes storage file names and falls back safely', () => {
    expect(sanitizeDocumentStorageFileName('../Q4 Evidence\r\nFinal.pdf')).toBe('q4-evidence-final.pdf');
    expect(sanitizeDocumentStorageFileName('\u0000\u0001////')).toBe('document');
  });

  it('sanitizes signed download filenames without caller-controlled header characters', () => {
    expect(sanitizeDocumentDownloadFileName('../Board Pack\r\nContent-Disposition: evil.pdf')).toBe(
      'Board Pack Content-Disposition- evil.pdf',
    );
    expect(sanitizeDocumentDownloadFileName('CON')).toBe('document');
    expect(sanitizeDocumentDownloadFileName('Relatório 2026.pdf')).toBe('Relat-rio 2026.pdf');
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
