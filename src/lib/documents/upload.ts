export const DOCUMENT_BUCKET = 'compliance-documents';

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

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

export function buildDocumentStoragePath(params: {
  organizationId: string;
  userId: string;
  fileName: string;
}) {
  const safeFileName = params.fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

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
