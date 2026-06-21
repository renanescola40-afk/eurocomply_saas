import { existsSync, readFileSync } from 'node:fs';

const helperPath = 'src/server/security/malware-scan.ts';
const uploadSecurityPath = 'src/server/security/upload-security.ts';
const uploadRoutePath = 'src/app/api/documents/upload/route.ts';
const preflightPath = 'scripts/preflight.mjs';
const docPath = 'docs/security/UPLOAD_CONTENT_SCAN.md';
const uploadSecurityDocPath = 'docs/security/UPLOAD_SECURITY.md';

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function requireTokens(path, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      failures.push(`${path} missing upload content scan token: ${token}`);
    }
  }
}

console.log('EuroComply upload content scan check');
console.log('-------------------------------------');

const helper = read(helperPath);
const uploadSecurity = read(uploadSecurityPath);
const uploadRoute = read(uploadRoutePath);
const preflight = read(preflightPath);
const doc = read(docPath);
const uploadSecurityDoc = read(uploadSecurityDocPath);

if (helper) {
  requireTokens(helperPath, helper, [
    'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
    'MALWARE_SCANNER_PROVIDER',
    'MALWARE_SCANNER_API_KEY',
    'MALWARE_SCANNER_TIMEOUT_MS',
    'MalwareScannerProvider',
    'createConfiguredMalwareScannerProvider',
    'scanUploadForMalware',
    'shouldBlockUploadForMalwareScan',
    'clean',
    'not_configured',
    'unavailable',
    'suspicious',
    'infected',
    'mock',
    'test or development',
  ]);

  if (
    !helper.includes('process.env[REQUIRE_MALWARE_SCAN_ENV]') &&
    !helper.includes('process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS')
  ) {
    failures.push(`${helperPath} must read REQUIRE_MALWARE_SCAN_FOR_UPLOADS from environment`);
  }

  if (!helper.includes('return result.required && result.status !==')) {
    failures.push(`${helperPath} must fail closed when upload scanning is required and not clean`);
  }
}

if (uploadSecurity) {
  requireTokens(uploadSecurityPath, uploadSecurity, [
    'configuredMalwareScannerProvider',
    'createMockMalwareScannerProvider',
    'isMockMalwareScannerAllowed',
    'validateEnterpriseUploadScan',
    'buildUploadSecurityMetadata',
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
  ]);
}

if (uploadRoute) {
  requireTokens(uploadRoutePath, uploadRoute, [
    'validateUploadPayload',
    'scanUploadForMalware',
    'shouldBlockUploadForMalwareScan',
    'document_upload_rejected',
    'UPLOAD_AUDIT_EVENTS.uploadRequested',
    'UPLOAD_AUDIT_EVENTS.uploadScanned',
    'UPLOAD_AUDIT_EVENTS.uploadBlocked',
    'scanStatus',
    'scanProvider',
    'scanRequired',
    'scanCheckedAt',
    'fileHash',
    'fileSize',
    'mimeDetected',
    'scan_status',
    'scan_provider',
    'scan_required',
    'scan_checked_at',
    'file_hash',
    'file_size',
    'mime_detected',
  ]);

  const scanIndex = uploadRoute.indexOf('scanUploadForMalware');
  const storageIndex = uploadRoute.indexOf('.storage.from');
  if (scanIndex === -1 || storageIndex === -1 || scanIndex > storageIndex) {
    failures.push(`${uploadRoutePath} must run content scan before storage upload`);
  }
}

if (preflight) {
  requireTokens(preflightPath, preflight, [
    'src/server/security/upload-security.ts',
    'src/server/security/malware-scan.ts',
    'scripts/security/check-upload-content-scan.mjs',
    'docs/security/UPLOAD_CONTENT_SCAN.md',
    'docs/security/UPLOAD_SECURITY.md',
    'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
    'MALWARE_SCANNER_PROVIDER',
  ]);
}

if (doc) {
  requireTokens(docPath, doc, [
    'Upload Content Scan Security Standard',
    'src/server/security/upload-security.ts',
    'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
    'MALWARE_SCANNER_PROVIDER',
    'MALWARE_SCANNER_API_KEY',
    'advisory',
    'fail-closed',
    'scanStatus',
    'scanProvider',
    'scanRequired',
    'scanCheckedAt',
    'fileHash',
    'fileSize',
    'mimeDetected',
    'upload_requested',
    'upload_scanned',
    'upload_blocked',
    'download_requested',
    'download_denied',
    'Enterprise Release Rule',
  ]);
}

if (uploadSecurityDoc) {
  requireTokens(uploadSecurityDocPath, uploadSecurityDoc, [
    'Enterprise upload/download/preview security standard',
    'fail-closed',
    'tenant isolation',
    'MALWARE_SCANNER_API_KEY',
    'scanStatus',
    'scanProvider',
    'scanRequired',
    'scanCheckedAt',
    'fileHash',
    'fileSize',
    'mimeDetected',
  ]);
}

if (failures.length > 0) {
  console.error('Upload content scan failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Upload content scan: ok');
}
