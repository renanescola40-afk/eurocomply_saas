import { describe, expect, it } from 'vitest';
import { validateUploadFileSignature } from './file-signature';

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
});
