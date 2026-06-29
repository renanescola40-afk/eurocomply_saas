import { createHash, randomUUID } from 'crypto';

import {
  DOCUMENT_BUCKET,
  MAX_DOCUMENT_SIZE_BYTES,
  assertDocumentStoragePathInOrganization,
  isDocumentStoragePathInOrganization,
  sanitizeDocumentDownloadFileName,
} from '@/lib/documents/upload';
import {
  UPLOAD_MIME_TYPE_TO_EXTENSION,
  validateUploadFileSecurity,
  validateUploadFileSignature,
  type SupportedUploadMimeType,
  type UploadFileSecurityValidation,
  type UploadFileType,
} from '@/server/security/file-signature';
import {
  scanUploadForMalware,
  shouldBlockUploadForMalwareScan,
  type MalwareScanResult,
  type MalwareScannerProvider,
} from '@/server/security/malware-scan';

export type { MalwareScanResult } from '@/server/security/malware-scan';

export const REQUIRE_MALWARE_SCAN_FOR_UPLOADS_ENV = 'REQUIRE_MALWARE_SCAN_FOR_UPLOADS';
export const LEGACY_MALWARE_SCAN_REQUIRED_ENV = 'MALWARE_SCAN_REQUIRED';
export const MALWARE_SCANNER_PROVIDER_ENV = 'MALWARE_SCANNER_PROVIDER';
export const MALWARE_SCANNER_API_KEY_ENV = 'MALWARE_SCANNER_API_KEY';
export const MALWARE_SCANNER_TIMEOUT_MS_ENV = 'MALWARE_SCANNER_TIMEOUT_MS';
export const MALWARE_SCANNER_ENDPOINT_ENV = 'MALWARE_SCANNER_ENDPOINT';
export const MALWARE_SCANNER_URL_ENV = 'MALWARE_SCANNER_URL';

export const MAX_UPLOAD_BYTES = MAX_DOCUMENT_SIZE_BYTES;
export const ALLOWED_TYPES = UPLOAD_MIME_TYPE_TO_EXTENSION;
export const CONTROLLED_DOCUMENT_STORAGE_BUCKET = DOCUMENT_BUCKET;
export const SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS = 60;
export const SIGNED_URL_EXPIRES_IN_SECONDS = SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS;

export const UPLOAD_SECURITY_AUDIT_EVENTS = {
  uploadRequested: 'upload_requested',
  uploadScanned: 'upload_scanned',
  uploadBlocked: 'upload_blocked',
  uploadAccepted: 'upload_accepted',
  downloadRequested: 'download_requested',
  downloadDenied: 'download_denied',
} as const;

export type UploadSecurityAuditEvent = (typeof UPLOAD_SECURITY_AUDIT_EVENTS)[keyof typeof UPLOAD_SECURITY_AUDIT_EVENTS];

export type UploadSecurityValidationResult =
  | {
      ok: true;
      buffer: Buffer;
      fileHash: string;
      checksumSha256: string;
      fileSize: number;
      fileNameSanitized: string;
      claimedMimeType: string;
      mimeDetected: SupportedUploadMimeType;
      extension: UploadFileType['extension'];
      declaredSignatureMatches: boolean;
      validation: Extract<UploadFileSecurityValidation, { ok: true }>;
    }
  | {
      ok: false;
      reason: Extract<UploadFileSecurityValidation, { ok: false }>['reason'] | 'signature_mismatch';
      message: string;
      buffer: Buffer;
      fileHash: string;
      checksumSha256: string;
      fileSize: number;
      fileNameSanitized: string;
      claimedMimeType: string;
      mimeDetected: string | null;
      declaredSignatureMatches: boolean;
      validation: Extract<UploadFileSecurityValidation, { ok: false }>;
    };

export type UploadSecurityAuditMetadataInput = {
  organizationId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  reason?: string | null;
  scan?: MalwareScanResult | null;
  fileHash?: string | null;
  fileSize?: number | null;
  claimedMimeType?: string | null;
  mimeDetected?: string | null;
  declaredSignatureMatches?: boolean | null;
  documentId?: string | null;
  accessPurpose?: 'download' | 'preview' | 'upload' | null;
  expiresInSeconds?: number | null;
};

function sanitizeStoragePathSegment(segment: string, label: string) {
  const normalized = String(segment ?? '').normalize('NFKC').replace(/[^a-zA-Z0-9_-]+/g, '').trim();

  if (!normalized) {
    throw new Error(`Invalid ${label} for document storage path`);
  }

  return normalized;
}

export function isUploadMalwareScanRequired() {
  return process.env[REQUIRE_MALWARE_SCAN_FOR_UPLOADS_ENV] === 'true' || process.env[LEGACY_MALWARE_SCAN_REQUIRED_ENV] === 'true';
}

export function currentUploadMalwareScannerProvider() {
  return process.env[MALWARE_SCANNER_PROVIDER_ENV]?.trim() || 'not_configured';
}

export function sanitizeUploadFileName(fileName: string | null | undefined) {
  return sanitizeDocumentDownloadFileName(fileName);
}

export async function validateUploadSecurityFile(file: File, options: { maxBytes?: number } = {}): Promise<UploadSecurityValidationResult> {
  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash('sha256').update(buffer).digest('hex');
  const declaredSignatureMatches = validateUploadFileSignature(file.type, buffer);
  const fileNameSanitized = sanitizeUploadFileName(file.name);
  const validation = validateUploadFileSecurity({
    fileName: file.name,
    claimedMimeType: file.type,
    sizeBytes: file.size,
    bytes: buffer,
    maxBytes,
  });

  if (!validation.ok) {
    const reason = !declaredSignatureMatches && validation.reason === 'unsupported_mime_type' && !validation.detectedType
      ? 'signature_mismatch'
      : validation.reason;
    const message = reason === 'signature_mismatch'
      ? 'File signature does not match the declared file type.'
      : validation.message;

    return {
      ok: false,
      reason,
      message,
      buffer,
      fileHash,
      checksumSha256: fileHash,
      fileSize: file.size,
      fileNameSanitized,
      claimedMimeType: file.type,
      mimeDetected: validation.detectedType?.mimeType ?? null,
      declaredSignatureMatches,
      validation,
    };
  }

  return {
    ok: true,
    buffer,
    fileHash,
    checksumSha256: fileHash,
    fileSize: file.size,
    fileNameSanitized,
    claimedMimeType: file.type,
    mimeDetected: validation.mimeType,
    extension: validation.extension,
    declaredSignatureMatches,
    validation,
  };
}

export const validateUploadPayload = validateUploadSecurityFile;

export async function scanValidatedUploadForMalware(input: {
  validation: Extract<UploadSecurityValidationResult, { ok: true }>;
  organizationId: string;
}) {
  const required = isUploadMalwareScanRequired();
  const provider = currentUploadMalwareScannerProvider();

  if (required && provider === 'not_configured') {
    return {
      status: 'not_configured',
      provider,
      required,
      scannedAt: new Date().toISOString(),
      reason: 'scanner_not_configured',
    } satisfies MalwareScanResult;
  }

  const scan = await scanUploadForMalware({
    buffer: input.validation.buffer,
    mimeType: input.validation.mimeDetected,
    filename: input.validation.fileNameSanitized,
    organizationId: input.organizationId,
    fileHash: input.validation.fileHash,
  });

  return { ...scan, required } satisfies MalwareScanResult;
}

export function buildTenantScopedUploadPath(input: {
  organizationId: string;
  userId: string;
  extension: UploadFileType['extension'];
}) {
  const organizationId = sanitizeStoragePathSegment(input.organizationId, 'organizationId');
  const userId = sanitizeStoragePathSegment(input.userId, 'userId');
  const extension = sanitizeStoragePathSegment(input.extension, 'extension').toLowerCase();
  const storagePath = `${organizationId}/${userId}/${randomUUID()}.${extension}`;

  assertDocumentStoragePathInOrganization(storagePath, input.organizationId);

  return storagePath;
}

export function buildTenantIsolatedUploadStoragePath(input: {
  organizationId: string;
  actorUserId: string;
  extension: UploadFileType['extension'];
}) {
  return buildTenantScopedUploadPath({ organizationId: input.organizationId, userId: input.actorUserId, extension: input.extension });
}

export function isTenantScopedStoragePath(storagePath: string | null | undefined, organizationId: string) {
  return isDocumentStoragePathInOrganization(storagePath, organizationId);
}

export { isDocumentStoragePathInOrganization };

export function assertTenantStoragePathInOrganization(storagePath: string | null | undefined, organizationId: string) {
  return assertDocumentStoragePathInOrganization(storagePath, organizationId);
}

export const assertTenantScopedStoragePath = assertTenantStoragePathInOrganization;

export function isShortLivedSignedUrlExpiry(expiresInSeconds: number) {
  return Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 && expiresInSeconds <= SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS;
}

export function isSignedUrlExpired(expiresAt: string | number | Date, now: Date = new Date()) {
  const expiresAtMs = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtMs) ? expiresAtMs <= now.getTime() : true;
}

export function createMockMalwareScannerProvider(input: {
  status: MalwareScanResult['status'];
  required?: boolean;
  reason?: string;
  signature?: string;
  provider?: string;
}): MalwareScannerProvider {
  const provider = input.provider ?? 'mock';

  return {
    name: provider,
    scan(_scanInput, context) {
      return {
        status: input.status,
        provider,
        required: input.required ?? context.required,
        scannedAt: context.scannedAt,
        reason: input.reason,
        signature: input.signature,
      };
    },
  };
}

export function buildUploadSecurityAuditMetadata(input: UploadSecurityAuditMetadataInput) {
  const scan = input.scan ?? null;
  const scanStatus = scan?.status ?? 'not_run';
  const scanProvider = scan?.provider ?? currentUploadMalwareScannerProvider();
  const scanRequired = scan?.required ?? isUploadMalwareScanRequired();
  const scanCheckedAt = scan?.scannedAt ?? null;
  const fileHash = input.fileHash ?? null;
  const fileSize = input.fileSize ?? null;
  const mimeDetected = input.mimeDetected ?? null;

  return {
    reason: input.reason ?? null,
    scanStatus,
    scanProvider,
    scanRequired,
    scanCheckedAt,
    scanReason: scan?.reason ?? null,
    scanSignature: scan?.signature ?? null,
    fileHash,
    checksumSha256: fileHash,
    fileSize,
    claimedMimeType: input.claimedMimeType ?? null,
    mimeDetected,
    declaredSignatureMatches: input.declaredSignatureMatches ?? null,
    organizationId: input.organizationId ?? null,
    actorUserId: input.actorUserId ?? null,
    actorRole: input.actorRole ?? null,
    documentId: input.documentId ?? null,
    accessPurpose: input.accessPurpose ?? null,
    expiresInSeconds: input.expiresInSeconds ?? null,
  };
}

export { shouldBlockUploadForMalwareScan };
