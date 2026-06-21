import { createHash, randomUUID } from 'crypto';

import { assertDocumentStoragePathInOrganization, sanitizeDocumentDownloadFileName } from '@/lib/documents/upload';

import {
  UPLOAD_MIME_TYPE_TO_EXTENSION,
  validateUploadFileSecurity as validateUploadFileSecurityInternal,
  validateUploadFileSignature,
  type SupportedUploadMimeType,
  type UploadFileSecurityValidation,
} from './file-signature';
import {
  MALWARE_SCANNER_PROVIDER_ENV,
  REQUIRE_MALWARE_SCAN_ENV,
  scanUploadForMalware as scanUploadForMalwareInternal,
  shouldBlockUploadForMalwareScan,
  type MalwareScanInput,
  type MalwareScanResult,
  type MalwareScanStatus,
} from './malware-scan';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES = UPLOAD_MIME_TYPE_TO_EXTENSION;
export const SIGNED_URL_EXPIRES_IN_SECONDS = 60;

export const UPLOAD_AUDIT_EVENTS = {
  uploadRequested: 'upload_requested',
  uploadScanned: 'upload_scanned',
  uploadBlocked: 'upload_blocked',
  downloadRequested: 'download_requested',
  downloadDenied: 'download_denied',
} as const;

export type UploadAuditEvent = (typeof UPLOAD_AUDIT_EVENTS)[keyof typeof UPLOAD_AUDIT_EVENTS];

export type MalwareScannerProvider = {
  name: string;
  scan(input: MalwareScanInput): Promise<MalwareScanResult>;
};

type SuccessfulUploadFileSecurityValidation = Extract<UploadFileSecurityValidation, { ok: true }>;
type FailedUploadFileSecurityValidation = Extract<UploadFileSecurityValidation, { ok: false }>;

export type UploadSecurityMetadata = {
  scanStatus: MalwareScanStatus | 'not_run';
  scanProvider: string;
  scanRequired: boolean;
  scanCheckedAt: string | null;
  fileHash: string | null;
  checksumSha256: string | null;
  fileSize: number;
  fileSizeBytes: number;
  sizeBytes: number;
  mimeDetected: string | null;
  mimeType: string | null;
  claimedMimeType: string | null;
  declaredSignatureMatches: boolean | null;
  organizationId: string | null;
  actorUserId: string | null;
  reason?: string | null;
  scanReason?: string | null;
};

export type UploadPayloadValidationResult =
  | {
      ok: true;
      buffer: Buffer;
      fileHash: string;
      fileSize: number;
      mimeDetected: SupportedUploadMimeType;
      sanitizedFileName: string;
      declaredSignatureMatches: boolean;
      validation: SuccessfulUploadFileSecurityValidation;
    }
  | {
      ok: false;
      reason: FailedUploadFileSecurityValidation['reason'] | 'path_traversal';
      message: string;
      buffer?: Buffer;
      fileHash?: string;
      fileSize: number;
      mimeDetected: string | null;
      sanitizedFileName: string;
      declaredSignatureMatches: boolean | null;
      validation?: FailedUploadFileSecurityValidation;
    };

export function configuredMalwareScannerProvider(): MalwareScannerProvider {
  return {
    name: process.env[MALWARE_SCANNER_PROVIDER_ENV]?.trim() || 'not_configured',
    scan: scanUploadForMalwareInternal,
  };
}

export function isMockMalwareScannerAllowed() {
  return process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
}

export function createMockMalwareScannerProvider(result?: Partial<MalwareScanResult>): MalwareScannerProvider {
  if (!isMockMalwareScannerAllowed()) {
    throw new Error('Mock malware scanner providers are allowed only in test or development environments.');
  }

  return {
    name: result?.provider ?? 'mock',
    async scan() {
      const scannedAt = new Date().toISOString();
      return {
        status: result?.status ?? 'clean',
        provider: result?.provider ?? 'mock',
        required: result?.required ?? (process.env[REQUIRE_MALWARE_SCAN_ENV] === 'true'),
        scannedAt: result?.scannedAt ?? scannedAt,
        reason: result?.reason ?? 'Mock malware scanner verdict for test/development only.',
        signature: result?.signature,
      };
    },
  };
}

export function sanitizeUploadFilename(fileName: string | null | undefined) {
  return sanitizeDocumentDownloadFileName(fileName);
}

export function hasPathTraversal(input: string | null | undefined) {
  const normalized = String(input ?? '').normalize('NFKC').replace(/\\/g, '/');
  return normalized.startsWith('/') || normalized.split('/').some((segment) => segment === '..' || segment === '.');
}

function sanitizeStoragePathSegment(segment: string, label: string) {
  const normalized = String(segment ?? '').normalize('NFKC').replace(/[^a-zA-Z0-9_-]+/g, '').trim();

  if (!normalized) {
    throw new Error(`Invalid ${label} for upload storage path`);
  }

  return normalized;
}

export function buildTenantIsolatedUploadStoragePath(input: {
  organizationId: string;
  actorUserId: string;
  extension: string;
}) {
  const organizationId = sanitizeStoragePathSegment(input.organizationId, 'organizationId');
  const actorUserId = sanitizeStoragePathSegment(input.actorUserId, 'actorUserId');
  const extension = sanitizeStoragePathSegment(input.extension, 'extension').toLowerCase();
  const storagePath = `${organizationId}/${actorUserId}/${randomUUID()}.${extension}`;

  assertDocumentStoragePathInOrganization(storagePath, organizationId);
  return storagePath;
}

export function assertTenantScopedStoragePath(storagePath: string | null | undefined, organizationId: string) {
  assertDocumentStoragePathInOrganization(storagePath, organizationId);
}

export function isShortLivedSignedUrlExpiry(seconds: number) {
  return Number.isInteger(seconds) && seconds > 0 && seconds <= SIGNED_URL_EXPIRES_IN_SECONDS;
}

export async function validateUploadPayload(input: {
  file: File;
  maxBytes?: number;
}): Promise<UploadPayloadValidationResult> {
  const maxBytes = input.maxBytes ?? MAX_UPLOAD_BYTES;
  const sanitizedFileName = sanitizeUploadFilename(input.file.name);

  if (hasPathTraversal(input.file.name)) {
    return {
      ok: false,
      reason: 'path_traversal',
      message: 'File name must not contain path traversal segments.',
      fileSize: input.file.size,
      mimeDetected: null,
      sanitizedFileName,
      declaredSignatureMatches: null,
    };
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const fileHash = createHash('sha256').update(buffer).digest('hex');
  const declaredSignatureMatches = validateUploadFileSignature(input.file.type, buffer);
  const validation = validateUploadFileSecurityInternal({
    fileName: input.file.name,
    claimedMimeType: input.file.type,
    sizeBytes: input.file.size,
    bytes: buffer,
    maxBytes,
  });

  if (!validation.ok) {
    return {
      ok: false,
      reason: validation.reason,
      message: validation.message,
      buffer,
      fileHash,
      fileSize: input.file.size,
      mimeDetected: validation.detectedType?.mimeType ?? null,
      sanitizedFileName,
      declaredSignatureMatches,
      validation,
    };
  }

  return {
    ok: true,
    buffer,
    fileHash,
    fileSize: input.file.size,
    mimeDetected: validation.mimeType,
    sanitizedFileName,
    declaredSignatureMatches,
    validation,
  };
}

export function buildUploadSecurityMetadata(input: {
  fileHash?: string | null;
  fileSize: number;
  mimeDetected?: string | null;
  claimedMimeType?: string | null;
  declaredSignatureMatches?: boolean | null;
  scan?: MalwareScanResult | null;
  reason?: string | null;
  organizationId?: string | null;
  actorUserId?: string | null;
}): UploadSecurityMetadata {
  const scan = input.scan;
  const scanProvider = scan?.provider ?? (process.env[MALWARE_SCANNER_PROVIDER_ENV]?.trim() || 'not_configured');
  const scanRequired = scan?.required ?? (process.env[REQUIRE_MALWARE_SCAN_ENV] === 'true');
  const mimeDetected = input.mimeDetected ?? null;
  const fileHash = input.fileHash ?? null;

  return {
    scanStatus: scan?.status ?? 'not_run',
    scanProvider,
    scanRequired,
    scanCheckedAt: scan?.scannedAt ?? null,
    fileHash,
    checksumSha256: fileHash,
    fileSize: input.fileSize,
    fileSizeBytes: input.fileSize,
    sizeBytes: input.fileSize,
    mimeDetected,
    mimeType: mimeDetected,
    claimedMimeType: input.claimedMimeType ?? null,
    declaredSignatureMatches: input.declaredSignatureMatches ?? null,
    organizationId: input.organizationId ?? null,
    actorUserId: input.actorUserId ?? null,
    reason: input.reason ?? null,
    scanReason: scan?.reason ?? null,
  };
}

export async function scanUploadForMalware(input: MalwareScanInput) {
  return configuredMalwareScannerProvider().scan(input);
}

export function validateEnterpriseUploadScan(scan: MalwareScanResult) {
  return !shouldBlockUploadForMalwareScan(scan);
}

export { shouldBlockUploadForMalwareScan, validateUploadFileSignature };
export const validateUploadFileSecurity = validateUploadFileSecurityInternal;
export type { MalwareScanResult, MalwareScanStatus };
