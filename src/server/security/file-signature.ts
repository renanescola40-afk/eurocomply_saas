const ZIP_HEADER = [0x50, 0x4b, 0x03, 0x04];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff];
const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d];

export type SupportedUploadMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'image/png'
  | 'image/jpeg';

function startsWith(bytes: Buffer, signature: number[]) {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function bufferIncludesAscii(bytes: Buffer, text: string) {
  return bytes.includes(Buffer.from(text, 'ascii'));
}

function hasZipOpenXmlSignature(bytes: Buffer, expectedContentType: 'word' | 'spreadsheet') {
  if (!startsWith(bytes, ZIP_HEADER)) return false;

  const maxScanBytes = Math.min(bytes.length, 512 * 1024);
  const head = bytes.subarray(0, maxScanBytes);

  if (!bufferIncludesAscii(head, '[Content_Types].xml')) return false;

  if (expectedContentType === 'word') {
    return bufferIncludesAscii(head, 'word/');
  }

  return bufferIncludesAscii(head, 'xl/');
}

export function validateUploadFileSignature(mimeType: string, bytes: Buffer) {
  switch (mimeType as SupportedUploadMimeType) {
    case 'application/pdf':
      return startsWith(bytes, PDF_HEADER);
    case 'image/png':
      return startsWith(bytes, PNG_HEADER);
    case 'image/jpeg':
      return startsWith(bytes, JPEG_HEADER);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return hasZipOpenXmlSignature(bytes, 'word');
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return hasZipOpenXmlSignature(bytes, 'spreadsheet');
    default:
      return false;
  }
}
