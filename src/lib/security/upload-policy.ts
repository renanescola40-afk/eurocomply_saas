const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'dll',
  'bat',
  'cmd',
  'com',
  'scr',
  'ps1',
  'sh',
  'bash',
  'zsh',
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'jsx',
  'php',
  'py',
  'rb',
  'pl',
  'jar',
  'war',
  'svg',
  'html',
  'htm',
  'xml',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
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

function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  if (parts.length < 2) return '';
  return parts.at(-1)?.trim() ?? '';
}

export function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 140);

  return normalized || `upload-${Date.now()}`;
}

export function validateUploadPolicy(input: UploadPolicyInput): UploadPolicyResult {
  const maxBytes = input.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
  const safeFileName = sanitizeFileName(input.fileName);
  const extension = getExtension(safeFileName);

  if (!extension) {
    return { allowed: false, reason: 'File extension is required' };
  }

  if (BLOCKED_EXTENSIONS.has(extension)) {
    return { allowed: false, reason: 'File type is blocked for security reasons' };
  }

  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    return { allowed: false, reason: 'MIME type is not allowed' };
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
