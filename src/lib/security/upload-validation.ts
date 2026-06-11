const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const BLOCKED_EXTENSIONS = new Set([
  'app',
  'bat',
  'bin',
  'cmd',
  'com',
  'cpl',
  'dll',
  'dmg',
  'exe',
  'gadget',
  'hta',
  'jar',
  'js',
  'jse',
  'lnk',
  'msi',
  'msp',
  'pif',
  'ps1',
  'scr',
  'sh',
  'svg',
  'vb',
  'vbe',
  'vbs',
  'ws',
  'wsc',
  'wsf',
  'wsh',
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

function getExtension(filename: string) {
  const parts = filename.toLowerCase().split('.');
  if (parts.length < 2) return '';
  return parts.at(-1) ?? '';
}

export function assertSafeUpload(file: UploadLike, options?: { maxSizeBytes?: number; allowedMimeTypes?: Set<string> }) {
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  const allowedMimeTypes = options?.allowedMimeTypes ?? ALLOWED_MIME_TYPES;
  const filename = file.name?.trim() ?? '';
  const mimeType = file.type?.trim().toLowerCase() ?? '';
  const size = file.size ?? 0;
  const extension = getExtension(filename);

  if (!filename) {
    throw new UploadValidationError('Missing filename');
  }

  if (filename.includes('\0')) {
    throw new UploadValidationError('Invalid filename');
  }

  if (BLOCKED_EXTENSIONS.has(extension)) {
    throw new UploadValidationError(`.${extension} files are not allowed`);
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
