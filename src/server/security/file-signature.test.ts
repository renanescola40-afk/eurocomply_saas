import { describe, expect, it } from 'vitest';
import { validateUploadFileSecurity, validateUploadFileSignature } from './file-signature';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function validatePdfName(fileName: string) {
  const bytes = Buffer.from('%PDF-1.7\nbody');

  return validateUploadFileSecurity({
    fileName,
    claimedMimeType: 'application/pdf',
    sizeBytes: bytes.length,
    bytes,
    maxBytes: MAX_UPLOAD_BYTES,
  });
}

describe('validateUploadFileSignature', () => {
  it('accepts PDF header', () => {
    expect(validateUploadFileSignature('application/pdf', Buffer.from('%PDF-1.7\nbody'))).toBe(true);
  });

  it('rejects fake PDF content', () => {
    expect(validateUploadFileSignature('application/pdf', Buffer.from('<script>alert(1)</script>'))).toBe(false);
  });

  it('accepts PNG header', () => {
    expect(validateUploadFileSignature('image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]))).toBe(true);
  });

  it('accepts JPEG header', () => {
    expect(validateUploadFileSignature('image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00]))).toBe(true);
  });

  it('accepts DOCX-like OpenXML package', () => {
    const bytes = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('...[Content_Types].xml...word/document.xml...', 'ascii'),
    ]);

    expect(validateUploadFileSignature('application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes)).toBe(true);
  });

  it('accepts XLSX-like OpenXML package', () => {
    const bytes = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('...[Content_Types].xml...xl/workbook.xml...', 'ascii'),
    ]);

    expect(validateUploadFileSignature('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes)).toBe(true);
  });

  it('rejects ZIP without expected OpenXML structure', () => {
    const bytes = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('random zip payload', 'ascii'),
    ]);

    expect(validateUploadFileSignature('application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes)).toBe(false);
  });

  it('rejects upload filenames containing path separators or traversal-only segments', () => {
    expect(validatePdfName('../policy.pdf')).toMatchObject({ ok: false, reason: 'path_traversal' });
    expect(validatePdfName('..\\policy.pdf')).toMatchObject({ ok: false, reason: 'path_traversal' });
    expect(validatePdfName('reports/../policy.pdf')).toMatchObject({ ok: false, reason: 'path_traversal' });
    expect(validatePdfName('./policy.pdf')).toMatchObject({ ok: false, reason: 'path_traversal' });
  });

  it('still accepts safe flat filenames after traversal hardening', () => {
    expect(validatePdfName('policy-final.2026.pdf')).toMatchObject({ ok: true, extension: 'pdf' });
  });

  it('rejects PDFs with active JavaScript or open actions', () => {
    const bytes = Buffer.from('%PDF-1.7\n1 0 obj << /OpenAction 2 0 R /JavaScript 3 0 R >>\n%%EOF', 'ascii');

    expect(
      validateUploadFileSecurity({
        fileName: 'policy.pdf',
        claimedMimeType: 'application/pdf',
        sizeBytes: bytes.length,
        bytes,
        maxBytes: MAX_UPLOAD_BYTES,
      }),
    ).toMatchObject({ ok: false, reason: 'active_content_detected' });
  });

  it('rejects PDFs with active content beyond the first 2 MiB', () => {
    const bytes = Buffer.concat([
      Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >>\n', 'ascii'),
      Buffer.alloc(2 * 1024 * 1024 + 64, 0x20),
      Buffer.from('2 0 obj << /OpenAction 3 0 R >>\n%%EOF', 'ascii'),
    ]);

    expect(bytes.length).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(
      validateUploadFileSecurity({
        fileName: 'late-action.pdf',
        claimedMimeType: 'application/pdf',
        sizeBytes: bytes.length,
        bytes,
        maxBytes: MAX_UPLOAD_BYTES,
      }),
    ).toMatchObject({ ok: false, reason: 'active_content_detected' });
  });

  it('rejects OpenXML documents containing macro or OLE payload markers', () => {
    const bytes = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('...[Content_Types].xml...word/document.xml...word/vbaProject.bin...word/embeddings/oleObject1.bin...', 'ascii'),
    ]);

    expect(
      validateUploadFileSecurity({
        fileName: 'policy.docx',
        claimedMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: bytes.length,
        bytes,
        maxBytes: MAX_UPLOAD_BYTES,
      }),
    ).toMatchObject({ ok: false, reason: 'active_content_detected' });
  });
});
