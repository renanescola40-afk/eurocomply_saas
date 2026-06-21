import { existsSync, readFileSync } from 'node:fs';

const uploadRoute = 'src/app/api/documents/upload/route.ts';
const uploadSecurityModule = 'src/server/security/upload-security.ts';
const signatureHelper = 'src/server/security/file-signature.ts';
const signatureTest = 'src/server/security/file-signature.test.ts';
const contentScanHelper = 'src/server/security/malware-scan.ts';
const downloadAction = 'src/server/actions/document-downloads.ts';

const requiredUploadTokens = [
  'assertTrustedOrigin',
  'noStoreJson',
  'assertOrganizationPermission',
  'manage_documents',
  'assertDocumentQuota',
  'validateUploadPayload',
  'scanUploadForMalware',
  'shouldBlockUploadForMalwareScan',
  'controlled-documents',
  'createAuditEvent',
  'UPLOAD_AUDIT_EVENTS.uploadRequested',
  'UPLOAD_AUDIT_EVENTS.uploadScanned',
  'UPLOAD_AUDIT_EVENTS.uploadBlocked',
  'document_upload_rejected',
  'malware_scan_not_clean',
  'document_uploaded',
  'checksum_sha256',
  'scan_status',
  'scan_provider',
  'scan_required',
  'scan_checked_at',
  'file_hash',
  'file_size',
  'mime_detected',
  'upload_security_metadata',
  'buildUploadSecurityMetadata',
  'fileHash',
  'fileSize',
  'mimeDetected',
  'MAX_UPLOAD_BYTES',
  'ALLOWED_TYPES',
  'buildTenantIsolatedUploadStoragePath',
];

const requiredUploadSecurityTokens = [
  'MAX_UPLOAD_BYTES',
  'ALLOWED_TYPES',
  'UPLOAD_AUDIT_EVENTS',
  'upload_requested',
  'upload_scanned',
  'upload_blocked',
  'download_requested',
  'download_denied',
  'MalwareScannerProvider',
  'configuredMalwareScannerProvider',
  'createMockMalwareScannerProvider',
  'isMockMalwareScannerAllowed',
  'validateUploadPayload',
  'validateUploadFileSecurity',
  'validateUploadFileSignature',
  'scanUploadForMalware',
  'shouldBlockUploadForMalwareScan',
  'buildUploadSecurityMetadata',
  'buildTenantIsolatedUploadStoragePath',
  'assertTenantScopedStoragePath',
  'isShortLivedSignedUrlExpiry',
  'scanStatus',
  'scanProvider',
  'scanRequired',
  'scanCheckedAt',
  'fileHash',
  'fileSize',
  'mimeDetected',
  'path_traversal',
];

const requiredSignatureTokens = [
  'PDF_HEADER',
  'PNG_HEADER',
  'JPEG_HEADER',
  'ZIP_HEADER',
  'WINDOWS_EXECUTABLE_HEADER',
  'ALLOWED_UPLOAD_EXTENSIONS',
  'DANGEROUS_UPLOAD_EXTENSIONS',
  'PDF_ACTIVE_CONTENT_PATTERN',
  'OPENXML_ACTIVE_CONTENT_MARKERS',
  'active_content_detected',
  'validateUploadFileSecurity',
  'validateUploadFileSignature',
  'dangerous_extension',
  'extension_mismatch',
  'mime_spoofing',
  '[Content_Types].xml',
  'word/',
  'xl/',
];

const requiredSignatureTestTokens = [
  'active_content_detected',
  '/OpenAction',
  'vbaProject.bin',
];

const requiredContentScanTokens = [
  'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
  'MALWARE_SCANNER_PROVIDER',
  'MALWARE_SCANNER_API_KEY',
  'MalwareScannerProvider',
  'createConfiguredMalwareScannerProvider',
  'mock',
  'test or development',
  'not_configured',
  'unavailable',
  'clean',
  'scanUploadForMalware',
  'shouldBlockUploadForMalwareScan',
];

const requiredDownloadTokens = [
  'createDocumentSignedDownloadUrl',
  'createDocumentSignedPreviewUrl',
  'UPLOAD_AUDIT_EVENTS.downloadRequested',
  'UPLOAD_AUDIT_EVENTS.downloadDenied',
  'assertCurrentUserCan',
  'documents:read',
  'assertDocumentStoragePathInOrganization',
  'SIGNED_URL_EXPIRES_IN_SECONDS',
  'isShortLivedSignedUrlExpiry',
  'createSignedUrl',
];

const failures = [];

function assertFile(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function assertTokens(source, tokens, path) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      failures.push(`${path} missing upload security token: ${token}`);
    }
  }
}

console.log('EuroComply upload security coverage check');
console.log('-----------------------------------------');

const uploadSource = assertFile(uploadRoute);
const uploadSecuritySource = assertFile(uploadSecurityModule);
const signatureSource = assertFile(signatureHelper);
const signatureTestSource = assertFile(signatureTest);
const contentScanSource = assertFile(contentScanHelper);
const downloadSource = assertFile(downloadAction);

if (uploadSource) assertTokens(uploadSource, requiredUploadTokens, uploadRoute);
if (uploadSecuritySource) assertTokens(uploadSecuritySource, requiredUploadSecurityTokens, uploadSecurityModule);
if (signatureSource) assertTokens(signatureSource, requiredSignatureTokens, signatureHelper);
if (signatureTestSource) assertTokens(signatureTestSource, requiredSignatureTestTokens, signatureTest);
if (contentScanSource) assertTokens(contentScanSource, requiredContentScanTokens, contentScanHelper);
if (downloadSource) assertTokens(downloadSource, requiredDownloadTokens, downloadAction);

if (uploadSource.includes('contentType: file.type')) {
  failures.push(`${uploadRoute} must never set storage contentType from client-declared MIME type`);
}

if (uploadSource.includes('supabase.storage') && uploadSource.indexOf('validateUploadPayload') > uploadSource.indexOf('supabase.storage')) {
  failures.push(`${uploadRoute} validates file security after storage access; complete validation must happen before upload`);
}

if (uploadSource.includes('.upload(storagePath') && uploadSource.indexOf('shouldBlockUploadForMalwareScan') > uploadSource.indexOf('.upload(storagePath')) {
  failures.push(`${uploadRoute} must enforce content scan policy before storing the upload`);
}

if (uploadSource.includes('document_uploaded') && !uploadSource.includes('mimeDetected')) {
  failures.push(`${uploadRoute} must include detected MIME evidence in successful upload audit metadata`);
}

if (contentScanSource && !contentScanSource.includes('return result.required && result.status !==')) {
  failures.push(`${contentScanHelper} must fail closed when scanning is required and the scan is not clean`);
}

if (uploadSecuritySource && /MALWARE_SCANNER_PROVIDER\s*=\s*['"]mock['"]/.test(uploadSecuritySource)) {
  failures.push(`${uploadSecurityModule} must not hard-code a mock malware scanner provider`);
}

if (downloadSource && !downloadSource.includes("createDocumentSignedAccessUrl(documentId, 'preview')")) {
  failures.push(`${downloadAction} must route preview signed URLs through the same RBAC and tenant checks as downloads`);
}

if (failures.length > 0) {
  console.error('Upload security coverage failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Upload security coverage: ok');
}
