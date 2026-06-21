const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  'apk',
  'app',
  'bat',
  'bin',
  'cmd',
  'com',
  'cpl',
  'deb',
  'dll',
  'dmg',
  'docm',
  'exe',
  'gadget',
  'hta',
  'html',
  'htm',
  'ipa',
  'iso',
  'jar',
  'js',
  'jse',
  'lnk',
  'mht',
  'mhtml',
  'msi',
  'msp',
  'pif',
  'php',
  'ps1',
  'psd1',
  'psm1',
  'reg',
  'rpm',
  'scf',
  'scr',
  'sct',
  'sh',
  'svg',
  'url',
  'vbe',
  'vbs',
  'ws',
  'wsc',
  'wsf',
  'wsh',
  'xlam',
  'xll',
  'xlsm',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);

const ALLOWED_EXTENSIONS_BY_MIME_TYPE = new Map([
  ['application/pdf', ['pdf']],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['docx']],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['xlsx']],
  ['image/png', ['png']],
  ['image/jpeg', ['jpg', 'jpeg']],
]);

export type UploadPolicyInput = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  maxBytes?: number;
};

export type UploadPolicyResult =
  | { allowed: true; safeFileName: string; extension: string }
  | { allowed: false; reason: string };

function fileNameSegments(fileName: string) {
  return sanitizeFileName(fileName)
    .toLowerCase()
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getExtension(fileName: string) {
  const parts = fileNameSegments(fileName);
  return parts.at(-1)?.trim() ?? '';
}

function hasBlockedExtension(fileName: string) {
  const parts = fileNameSegments(fileName);
  if (parts.length === 0) return true;
  return parts.some((part) => BLOCKED_EXTENSIONS.has(part));
}

function normalizeMimeType(mimeType: string) {
  return String(mimeType ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
}

export function sanitizeFileName(fileName: string) {
  const baseName = String(fileName ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .split(/[\\/]/)
    .pop() ?? '';

  const normalized = baseName
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:"*?<>|]+/g, '-')
    .replace(/[^a-zA-Z0-9._ -]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 140);

  return normalized || `upload-${Date.now()}`;
}

export function validateUploadPolicy(input: UploadPolicyInput): UploadPolicyResult {
  const maxBytes = input.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
  const safeFileName = sanitizeFileName(input.fileName);
  const extension = getExtension(safeFileName);
  const mimeType = normalizeMimeType(input.mimeType);
  const allowedExtensions = ALLOWED_EXTENSIONS_BY_MIME_TYPE.get(mimeType) ?? [];

  if (!extension) {
    return { allowed: false, reason: 'File extension is required' };
  }

  if (hasBlockedExtension(safeFileName)) {
    return { allowed: false, reason: 'File type is blocked for security reasons' };
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { allowed: false, reason: 'MIME type is not allowed' };
  }

  if (!allowedExtensions.includes(extension)) {
    return { allowed: false, reason: 'File extension does not match MIME type' };
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { allowed: false, reason: 'File size is invalid' };
  }

  if (input.sizeBytes > maxBytes) {
    return { allowed: false, reason: `File exceeds max upload size of ${Math.round(maxBytes / 1024 / 1024)}MB` };
  }

  return { allowed: true, safeFileName, extension };
}

export const uploadPolicy = {
  maxBytes: DEFAULT_MAX_UPLOAD_BYTES,
  allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
  blockedExtensions: Array.from(BLOCKED_EXTENSIONS),
};
