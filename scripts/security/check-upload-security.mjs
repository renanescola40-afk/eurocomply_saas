import { existsSync, readFileSync } from 'node:fs';

const uploadRoute = 'src/app/api/documents/upload/route.ts';
const signatureHelper = 'src/server/security/file-signature.ts';
const signatureTest = 'src/server/security/file-signature.test.ts';
const contentScanHelper = 'src/server/security/malware-scan.ts';

const requiredUploadTokens = [
  'assertTrustedOrigin',
  'noStoreJson',
  'assertOrganizationPermission',
  'manage_documents',
  'assertDocumentQuota',
  'validateUploadFileSecurity',
  'validateUploadFileSignature',
  'scanUploadForMalware',
  'shouldBlockUploadForMalwareScan',
  'createHash',
  'sha256',
  'tryCreateAdminClient',
  'controlled-documents',
  'createAuditEvent',
  'document_upload_rejected',
  'signature_mismatch',
  'malware_scan_not_clean',
  'document_uploaded',
  'checksumSha256',
  'scanStatus',
  'scanProvider',
  'scanRequired',
  'MAX_UPLOAD_BYTES',
  'ALLOWED_TYPES',
  'assertDocumentStoragePathInOrganization',
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
  'not_configured',
  'unavailable',
  'clean',
  'scanUploadForMalware',
  'shouldBlockUploadForMalwareScan',
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
const signatureSource = assertFile(signatureHelper);
const signatureTestSource = assertFile(signatureTest);
const contentScanSource = assertFile(contentScanHelper);

if (uploadSource) assertTokens(uploadSource, requiredUploadTokens, uploadRoute);
if (signatureSource) assertTokens(signatureSource, requiredSignatureTokens, signatureHelper);
if (signatureTestSource) assertTokens(signatureTestSource, requiredSignatureTestTokens, signatureTest);
if (contentScanSource) assertTokens(contentScanSource, requiredContentScanTokens, contentScanHelper);

if (uploadSource.includes('contentType: file.type') && !uploadSource.includes('validateUploadFileSignature(file.type, buffer)')) {
  failures.push(`${uploadRoute} sets storage contentType from client MIME without prior file signature validation`);
}

if (uploadSource.includes('supabase.storage') && uploadSource.indexOf('validateUploadFileSecurity') > uploadSource.indexOf('supabase.storage')) {
  failures.push(`${uploadRoute} validates file security after storage access; complete validation must happen before upload`);
}

if (uploadSource.includes('supabase.storage') && uploadSource.indexOf('validateUploadFileSignature') > uploadSource.indexOf('supabase.storage')) {
  failures.push(`${uploadRoute} validates file signature after storage access; validation must happen before upload`);
}

if (uploadSource.includes('.upload(storagePath') && uploadSource.indexOf('shouldBlockUploadForMalwareScan') > uploadSource.indexOf('.upload(storagePath')) {
  failures.push(`${uploadRoute} must enforce content scan policy before storing the upload`);
}

if (uploadSource.includes('document_uploaded') && !uploadSource.includes('scanCheckedAt')) {
  failures.push(`${uploadRoute} must include content scan evidence in successful upload audit metadata`);
}

if (contentScanSource && !contentScanSource.includes('required && result.status !==')) {
  failures.push(`${contentScanHelper} must fail closed when scanning is required and the scan is not clean`);
}

if (failures.length > 0) {
  console.error('Upload security coverage failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Upload security coverage: ok');
}
