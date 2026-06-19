const ZIP_HEADER = [0x50, 0x4b, 0x03, 0x04];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff];
const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d];
const WINDOWS_EXECUTABLE_HEADER = [0x4d, 0x5a];

export type SupportedUploadMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'image/png'
  | 'image/jpeg';

export type UploadFileType = {
  mimeType: SupportedUploadMimeType;
  extension: 'pdf' | 'docx' | 'xlsx' | 'png' | 'jpg';
};

export type UploadFileSecurityValidation =
  | {
      ok: true;
      mimeType: SupportedUploadMimeType;
      extension: UploadFileType['extension'];
      detectedType: UploadFileType;
    }
  | {
      ok: false;
      reason:
        | 'empty_file'
        | 'file_too_large'
        | 'dangerous_extension'
        | 'unsupported_extension'
        | 'unsupported_mime_type'
        | 'extension_mismatch'
        | 'mime_spoofing'
        | 'signature_mismatch';
      message: string;
      detectedType?: UploadFileType | null;
    };

export const UPLOAD_MIME_TYPE_TO_EXTENSION = new Map<SupportedUploadMimeType, UploadFileType['extension']>([
  ['application/pdf', 'pdf'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
]);

const ALLOWED_UPLOAD_EXTENSIONS = new Set(['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg']);
const DANGEROUS_UPLOAD_EXTENSIONS = new Set([
  'app',
  'bat',
  'cmd',
  'com',
  'cpl',
  'dll',
  'dmg',
  'exe',
  'hta',
  'html',
  'jar',
  'js',
  'jse',
  'lnk',
  'msi',
  'php',
  'ps1',
  'scr',
  'sh',
  'svg',
  'vbe',
  'vbs',
  'wsf',
]);

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

function fileNameSegments(fileName: string) {
  const baseName = String(fileName ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]+/g, '')
    .split(/[\\/]/)
    .pop() ?? '';

  return baseName
    .toLowerCase()
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function getUploadFileExtension(fileName: string) {
  const segments = fileNameSegments(fileName);
  return segments.at(-1) ?? '';
}

export function hasDangerousUploadFileName(fileName: string) {
  const segments = fileNameSegments(fileName);

  if (segments.length === 0) return true;

  return segments.some((segment) => DANGEROUS_UPLOAD_EXTENSIONS.has(segment));
}

export function detectUploadFileType(bytes: Buffer): UploadFileType | null {
  if (startsWith(bytes, WINDOWS_EXECUTABLE_HEADER)) return null;

  if (startsWith(bytes, PDF_HEADER)) {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }

  if (startsWith(bytes, PNG_HEADER)) {
    return { mimeType: 'image/png', extension: 'png' };
  }

  if (startsWith(bytes, JPEG_HEADER)) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }

  if (hasZipOpenXmlSignature(bytes, 'word')) {
    return {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
    };
  }

  if (hasZipOpenXmlSignature(bytes, 'spreadsheet')) {
    return {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };
  }

  return null;
}

export function validateUploadFileSignature(mimeType: string, bytes: Buffer) {
  const detectedType = detectUploadFileType(bytes);
  return detectedType?.mimeType === mimeType;
}

export function validateUploadFileSecurity(input: {
  fileName: string;
  claimedMimeType: string;
  sizeBytes: number;
  bytes: Buffer;
  maxBytes: number;
}): UploadFileSecurityValidation {
  if (input.sizeBytes <= 0 || input.bytes.length <= 0) {
    return { ok: false, reason: 'empty_file', message: 'File must not be empty.' };
  }

  if (input.sizeBytes > input.maxBytes || input.bytes.length > input.maxBytes) {
    return { ok: false, reason: 'file_too_large', message: 'File exceeds the maximum allowed size.' };
  }

  const extension = getUploadFileExtension(input.fileName);

  if (hasDangerousUploadFileName(input.fileName)) {
    return { ok: false, reason: 'dangerous_extension', message: 'File name contains a dangerous extension.' };
  }

  if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
    return { ok: false, reason: 'unsupported_extension', message: 'File extension is not allowed.' };
  }

  const detectedType = detectUploadFileType(input.bytes);

  if (!detectedType) {
    return { ok: false, reason: 'unsupported_mime_type', message: 'File content type is not allowed.', detectedType };
  }

  const extensionMatches = detectedType.extension === extension || (detectedType.extension === 'jpg' && extension === 'jpeg');

  if (!extensionMatches) {
    return {
      ok: false,
      reason: 'extension_mismatch',
      message: 'File extension does not match the detected file content.',
      detectedType,
    };
  }

  if (input.claimedMimeType !== detectedType.mimeType) {
    return {
      ok: false,
      reason: 'mime_spoofing',
      message: 'Claimed MIME type does not match detected file content.',
      detectedType,
    };
  }

  if (!validateUploadFileSignature(input.claimedMimeType, input.bytes)) {
    return {
      ok: false,
      reason: 'signature_mismatch',
      message: 'File signature does not match the declared file type.',
      detectedType,
    };
  }

  return {
    ok: true,
    mimeType: detectedType.mimeType,
    extension: detectedType.extension,
    detectedType,
  };
}
