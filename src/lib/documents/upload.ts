export const DOCUMENT_BUCKET = 'controlled-documents';

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const DOCUMENT_FILENAME_FALLBACK = 'document';
const MAX_DOCUMENT_FILENAME_LENGTH = 120;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

const DOCUMENT_EXTENSIONS_BY_MIME_TYPE: Record<AllowedDocumentMimeType, readonly string[]> = {
  'application/pdf': ['pdf'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
};

const DANGEROUS_DOCUMENT_EXTENSIONS = new Set([
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

export function isAllowedDocumentMimeType(mimeType: string): mimeType is AllowedDocumentMimeType {
  return ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType as AllowedDocumentMimeType);
}

function normalizeDocumentFileName(fileName: string | null | undefined) {
  const normalized = String(fileName ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/[\\/:"*?<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const asciiSafe = normalized
    .replace(/[^a-zA-Z0-9. _-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\s_-]+|[.\s_-]+$/g, '')
    .slice(0, MAX_DOCUMENT_FILENAME_LENGTH)
    .replace(/[.\s_-]+$/g, '');

  if (!asciiSafe || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(asciiSafe)) {
    return DOCUMENT_FILENAME_FALLBACK;
  }

  return asciiSafe;
}

function fileNameSegments(fileName: string | null | undefined) {
  return normalizeDocumentFileName(fileName)
    .toLowerCase()
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function getDocumentFileExtension(fileName: string | null | undefined) {
  const segments = fileNameSegments(fileName);
  return segments.at(-1) ?? '';
}

export function hasDangerousDocumentExtension(fileName: string | null | undefined) {
  return fileNameSegments(fileName).some((segment) => DANGEROUS_DOCUMENT_EXTENSIONS.has(segment));
}

export function sanitizeDocumentStorageFileName(fileName: string | null | undefined) {
  return normalizeDocumentFileName(fileName)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\-_]+|[.\-_]+$/g, '') || DOCUMENT_FILENAME_FALLBACK;
}

export function sanitizeDocumentDownloadFileName(fileName: string | null | undefined) {
  return normalizeDocumentFileName(fileName);
}

function sanitizeStoragePathSegment(segment: string, label: string) {
  const normalized = segment.normalize('NFKC').replace(/[^a-zA-Z0-9_-]+/g, '').trim();

  if (!normalized) {
    throw new Error(`Invalid ${label} for document storage path`);
  }

  return normalized;
}

export function buildDocumentStoragePath(params: {
  organizationId: string;
  userId: string;
  fileName: string;
}) {
  const organizationId = sanitizeStoragePathSegment(params.organizationId, 'organizationId');
  const userId = sanitizeStoragePathSegment(params.userId, 'userId');
  const safeFileName = sanitizeDocumentStorageFileName(params.fileName);

  return `${organizationId}/${userId}/${Date.now()}-${safeFileName}`;
}

export function isDocumentStoragePathInOrganization(storagePath: string | null | undefined, organizationId: string) {
  const normalizedPath = String(storagePath ?? '').normalize('NFKC').replace(/\\/g, '/').replace(/^\/+/, '');
  const normalizedOrganizationId = sanitizeStoragePathSegment(organizationId, 'organizationId');
  const segments = normalizedPath.split('/');

  if (segments.length < 2) return false;
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return false;

  return segments[0] === normalizedOrganizationId;
}

export function assertDocumentStoragePathInOrganization(storagePath: string | null | undefined, organizationId: string) {
  if (!isDocumentStoragePathInOrganization(storagePath, organizationId)) {
    throw new Error('Document storage path does not match organization scope');
  }
}

export function validateDocumentFile(file: File) {
  const declaredMimeType = file.type;

  if (file.size <= 0) {
    return 'File is empty.';
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return 'File is too large. Maximum size is 10MB.';
  }

  if (!isAllowedDocumentMimeType(declaredMimeType)) {
    return 'Unsupported file type.';
  }

  if (hasDangerousDocumentExtension(file.name)) {
    return 'File name contains a dangerous extension.';
  }

  const extension = getDocumentFileExtension(file.name);
  const allowedExtensions = DOCUMENT_EXTENSIONS_BY_MIME_TYPE[declaredMimeType];

  if (!allowedExtensions.includes(extension)) {
    return 'File extension does not match the declared file type.';
  }

  return null;
}
