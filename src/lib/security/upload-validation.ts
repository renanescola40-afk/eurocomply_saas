const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);

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
  'vb',
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

type UploadLike = {
  name?: string;
  type?: string;
  size?: number;
};

export class UploadValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'UploadValidationError';
    this.status = status;
  }
}

function normalizeFilename(filename: string) {
  const baseName = filename
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .split(/[\\/]/)
    .pop() ?? '';

  return baseName
    .replace(/[\\/:"*?<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9. _-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\s_-]+|[.\s_-]+$/g, '')
    .slice(0, 120)
    .replace(/[.\s_-]+$/g, '');
}

function fileNameSegments(filename: string) {
  return normalizeFilename(filename)
    .toLowerCase()
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getExtension(filename: string) {
  const parts = fileNameSegments(filename);
  return parts.at(-1) ?? '';
}

function hasBlockedExtension(filename: string) {
  const parts = fileNameSegments(filename);
  if (parts.length === 0) return true;
  return parts.some((part) => BLOCKED_EXTENSIONS.has(part));
}

export function assertSafeUpload(file: UploadLike, options?: { maxSizeBytes?: number; allowedMimeTypes?: Set<string> }) {
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  const allowedMimeTypes = options?.allowedMimeTypes ?? ALLOWED_MIME_TYPES;
  const filename = normalizeFilename(file.name?.trim() ?? '');
  const mimeType = file.type?.split(';')[0]?.trim().toLowerCase() ?? '';
  const size = file.size ?? 0;
  const extension = getExtension(filename);

  if (!filename) {
    throw new UploadValidationError('Missing filename');
  }

  if (filename.includes('\0')) {
    throw new UploadValidationError('Invalid filename');
  }

  if (hasBlockedExtension(filename)) {
    throw new UploadValidationError('File type is blocked for security reasons');
  }

  if (!mimeType || !allowedMimeTypes.has(mimeType)) {
    throw new UploadValidationError('File type is not allowed');
  }

  if (size <= 0) {
    throw new UploadValidationError('File is empty');
  }

  if (size > maxSizeBytes) {
    throw new UploadValidationError(`File is too large. Maximum size is ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
  }

  return {
    filename,
    mimeType,
    size,
    extension,
  };
}

export const safeUploadDefaults = {
  maxSizeBytes: DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  blockedExtensions: BLOCKED_EXTENSIONS,
};
