export const DOCUMENT_BUCKET = 'compliance-documents';

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const DOCUMENT_FILENAME_FALLBACK = 'document';
const MAX_DOCUMENT_FILENAME_LENGTH = 120;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export function isAllowedDocumentMimeType(mimeType: string) {
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

export function buildDocumentStoragePath(params: {
  organizationId: string;
  userId: string;
  fileName: string;
}) {
  const safeFileName = sanitizeDocumentStorageFileName(params.fileName);

  return `${params.organizationId}/${params.userId}/${Date.now()}-${safeFileName}`;
}

export function validateDocumentFile(file: File) {
  if (!isAllowedDocumentMimeType(file.type)) {
    return 'Unsupported file type.';
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return 'File is too large. Maximum size is 10MB.';
  }

  return null;
}
