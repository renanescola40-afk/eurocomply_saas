import { existsSync, readFileSync } from 'node:fs';

const uploadRoute = 'src/app/api/documents/upload/route.ts';
const uploadSecurityModule = 'src/server/security/upload-security.ts';
const signatureHelper = 'src/server/security/file-signature.ts';
const signatureTest = 'src/server/security/file-signature.test.ts';
const contentScanHelper = 'src/server/security/malware-scan.ts';
const downloadAction = 'src/server/actions/document-downloads.ts';
const serverActionUpload = 'src/server/actions/documents.ts';
const enterpriseBypassTest = 'tests/security/upload-enterprise-bypass.test.ts';
const evidencePath = 'docs/security/evidence/runtime/upload-malware-scan-validation.json';
const uploadSecurityDoc = 'docs/security/UPLOAD_SECURITY.md';

const tokenAliases = new Map([
  ['checksumSha256', ['checksum_sha256']],
  ['scanStatus', ['scan_status']],
  ['scanProvider', ['scan_provider']],
  ['scanRequired', ['scan_required']],
  ['scanCheckedAt', ['scan_checked_at']],
  ['hasCleanEnterpriseUploadScanMetadata', ['assertEnterpriseDocumentCreateHasTrustedProvenance']],
  ['not clean', ['provenance is not trusted']],
]);

const requiredUploadSecurityModuleTokens = [
  'UPLOAD_SECURITY_AUDIT_EVENTS',
  'upload_requested',
  'upload_scanned',
  'upload_blocked',
  'download_requested',
  'download_denied',
  'MAX_UPLOAD_BYTES',
  'ALLOWED_TYPES',
  'validateUploadSecurityFile',
  'validateUploadFileSecurity',
  'validateUploadFileSignature',
  'scanValidatedUploadForMalware',
  'scanUploadForMalware',
  'shouldBlockUploadForMalwareScan',
  'buildTenantScopedUploadPath',
  'assertTenantStoragePathInOrganization',
  'sanitizeUploadFileName',
  'createHash',
  'sha256',
  'fileHash',
  'fileSize',
  'mimeDetected',
  'scanStatus',
  'scanProvider',
  'scanRequired',
  'scanCheckedAt',
  'SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS',
  'isSignedUrlExpired',
  'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
  'MALWARE_SCANNER_PROVIDER',
  'MALWARE_SCANNER_API_KEY',
];

const requiredUploadTokens = [
  'assertTrustedOrigin',
  'noStoreJson',
  'assertOrganizationPermission',
  'manage_documents',
  'assertDocumentQuota',
  'rejectOversizedMultipartRequest',
  'MAX_MULTIPART_UPLOAD_BYTES',
  'content-length',
  'validateUploadSecurityFile',
  'scanValidatedUploadForMalware',
  'shouldBlockUploadForMalwareScan',
  'tryCreateAdminClient',
  'CONTROLLED_DOCUMENT_STORAGE_BUCKET',
  'createAuditEvent',
  'uploadRequested',
  'uploadScanned',
  'uploadBlocked',
  'document_upload_rejected',
  'malware_scan_not_clean',
  'document_uploaded',
  'checksumSha256',
  'scanStatus',
  'scanProvider',
  'scanRequired',
  'scanCheckedAt',
  'fileHash',
  'fileSize',
  'mimeDetected',
  'MAX_UPLOAD_BYTES',
  'ALLOWED_TYPES',
  'buildTenantScopedUploadPath',
  "policy: 'upload'",
];

const requiredServerActionTokens = [
  'validateUploadSecurityFile',
  'scanValidatedUploadForMalware',
  'shouldBlockUploadForMalwareScan',
  'isUploadMalwareScanRequired',
  'hasCleanEnterpriseUploadScanMetadata',
  'enterprise_upload_scan_bypass',
  'uploadRequested',
  'uploadScanned',
  'uploadBlocked',
  'scan_status',
  'scan_provider',
  'scan_required',
  'scan_checked_at',
  'file_hash',
  'file_size',
  'mime_detected',
  'buildTenantScopedUploadPath',
];

const requiredDownloadTokens = [
  'downloadRequested',
  'downloadDenied',
  'createDocumentSignedDownloadUrl',
  'createDocumentSignedPreviewUrl',
  'DOCUMENT_ID_PATTERN',
  'isValidDocumentId',
  'checkDistributedRateLimit',
  "policy: 'export'",
  'rate_limited',
  'invalid_document_id',
  'assertTenantStoragePathInOrganization',
  'assertCurrentUserCan',
  'documents:read',
  'createSignedUrl',
  'SIGNED_URL_EXPIRES_IN_SECONDS',
  'document_not_found_or_cross_tenant',
  'permission_denied',
  'invalid_storage_path',
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

const requiredSignatureTestTokens = ['active_content_detected', '/OpenAction', 'vbaProject.bin'];
const requiredEnterpriseBypassTestTokens = ['enterprise_upload_scan_bypass', 'REQUIRE_MALWARE_SCAN_FOR_UPLOADS', 'not clean', 'createAdminClient).not.toHaveBeenCalled', 'serverGenerated'];

const requiredContentScanTokens = [
  'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
  'MALWARE_SCANNER_PROVIDER',
  'MALWARE_SCANNER_API_KEY',
  'MalwareScannerProvider',
  'registerMalwareScannerProviderForTest',
  'Mock malware scanner providers are disabled outside test/development',
  'not_configured',
  'unavailable',
  'clean',
  'infected',
  'suspicious',
  'scanUploadForMalware',
  'shouldBlockUploadForMalwareScan',
];

const requiredEvidenceTokens = [
  'upload_requested',
  'upload_scanned',
  'upload_blocked',
  'download_requested',
  'download_denied',
  'scanStatus',
  'scanProvider',
  'scanRequired',
  'scanCheckedAt',
  'fileHash',
  'fileSize',
  'mimeDetected',
  'src/server/security/upload-security.ts',
];

const requiredDocTokens = [
  'Enterprise Upload Security Standard',
  'fail-closed',
  'REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true',
  'MALWARE_SCANNER_PROVIDER',
  'MALWARE_SCANNER_API_KEY',
  'enterprise_upload_scan_bypass',
  'upload_requested',
  'download_denied',
  'organizationId',
  'Signed URLs expire after 60 seconds',
];

const failures = [];

function assertFile(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function sourceHasToken(source, token) {
  if (source.includes(token)) return true;
  return (tokenAliases.get(token) ?? []).some((alias) => source.includes(alias));
}

function assertTokens(source, tokens, path) {
  for (const token of tokens) {
    if (!sourceHasToken(source, token)) failures.push(`${path} missing upload security token: ${token}`);
  }
}

function hasFailClosedRequiredScanPolicy(source) {
  return source.includes('required && result.status !==') || source.includes('if (scan.required) return true');
}

console.log('EuroComply upload security coverage check');
console.log('-----------------------------------------');

const uploadSource = assertFile(uploadRoute);
const uploadSecuritySource = assertFile(uploadSecurityModule);
const signatureSource = assertFile(signatureHelper);
const signatureTestSource = assertFile(signatureTest);
const enterpriseBypassTestSource = assertFile(enterpriseBypassTest);
const contentScanSource = assertFile(contentScanHelper);
const downloadSource = assertFile(downloadAction);
const serverActionSource = assertFile(serverActionUpload);
const evidenceSource = assertFile(evidencePath);
const docSource = assertFile(uploadSecurityDoc);

if (uploadSource) assertTokens(uploadSource, requiredUploadTokens, uploadRoute);
if (uploadSecuritySource) assertTokens(uploadSecuritySource, requiredUploadSecurityModuleTokens, uploadSecurityModule);
if (signatureSource) assertTokens(signatureSource, requiredSignatureTokens, signatureHelper);
if (signatureTestSource) assertTokens(signatureTestSource, requiredSignatureTestTokens, signatureTest);
if (enterpriseBypassTestSource) assertTokens(enterpriseBypassTestSource, requiredEnterpriseBypassTestTokens, enterpriseBypassTest);
if (contentScanSource) assertTokens(contentScanSource, requiredContentScanTokens, contentScanHelper);
if (downloadSource) assertTokens(downloadSource, requiredDownloadTokens, downloadAction);
if (serverActionSource) assertTokens(serverActionSource, requiredServerActionTokens, serverActionUpload);
if (evidenceSource) assertTokens(evidenceSource, requiredEvidenceTokens, evidencePath);
if (docSource) assertTokens(docSource, requiredDocTokens, uploadSecurityDoc);

if (uploadSource.includes('contentType: file.type')) failures.push(`${uploadRoute} must never set storage contentType from client-declared MIME`);
if (uploadSource.includes('request.formData()') && uploadSource.indexOf('rejectOversizedMultipartRequest') > uploadSource.indexOf('request.formData()')) failures.push(`${uploadRoute} must check request body size before parsing multipart formData`);
if (uploadSource.includes('supabase.storage') && uploadSource.indexOf('validateUploadSecurityFile') > uploadSource.indexOf('supabase.storage')) failures.push(`${uploadRoute} validates upload security after storage access; complete validation must happen before upload`);
if (uploadSource.includes('.upload(storagePath') && uploadSource.indexOf('shouldBlockUploadForMalwareScan') > uploadSource.indexOf('.upload(storagePath')) failures.push(`${uploadRoute} must enforce content scan policy before storing the upload`);
if (uploadSource.includes('document_uploaded') && !uploadSource.includes('mimeDetected')) failures.push(`${uploadRoute} must include detected MIME evidence in successful upload audit metadata`);
if (contentScanSource && !hasFailClosedRequiredScanPolicy(contentScanSource)) failures.push(`${contentScanHelper} must fail closed when scanning is required and the scan is not clean`);
if (serverActionSource.includes('buildDocumentStoragePath')) failures.push(`${serverActionUpload} must use buildTenantScopedUploadPath so storage paths are tenant scoped and filename-independent`);
if (serverActionSource.includes('createDocumentSchema') && !serverActionSource.includes('enterprise_upload_scan_bypass')) failures.push(`${serverActionUpload} must block enterprise document metadata creation without clean scan metadata`);
if (downloadSource.includes('createSignedUrl') && downloadSource.indexOf('assertTenantStoragePathInOrganization') > downloadSource.indexOf('createSignedUrl')) failures.push(`${downloadAction} must validate tenant storage path before signed URL creation`);
if (downloadSource.includes('createSignedUrl') && downloadSource.indexOf('isValidDocumentId') > downloadSource.indexOf('createSignedUrl')) failures.push(`${downloadAction} must validate documentId before signed URL creation`);

if (failures.length > 0) {
  console.error('Upload security coverage failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Upload security coverage: ok');
}
