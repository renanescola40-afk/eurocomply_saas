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
  'validateUploadFileSignature',
  'createHash',
  'sha256',
  'tryCreateAdminClient',
  'controlled-documents',
  'createAuditEvent',
  'document_upload_rejected',
  'signature_mismatch',
  'document_uploaded',
  'checksumSha256',
  'MAX_UPLOAD_BYTES',
  'ALLOWED_TYPES',
];

const requiredSignatureTokens = [
  'PDF_HEADER',
  'PNG_HEADER',
  'JPEG_HEADER',
  'ZIP_HEADER',
  'validateUploadFileSignature',
  '[Content_Types].xml',
  'word/',
  'xl/',
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
const contentScanSource = assertFile(contentScanHelper);
assertFile(signatureTest);

if (uploadSource) assertTokens(uploadSource, requiredUploadTokens, uploadRoute);
if (signatureSource) assertTokens(signatureSource, requiredSignatureTokens, signatureHelper);
if (contentScanSource) assertTokens(contentScanSource, requiredContentScanTokens, contentScanHelper);

if (uploadSource.includes('contentType: file.type') && !uploadSource.includes('validateUploadFileSignature(file.type, buffer)')) {
  failures.push(`${uploadRoute} sets storage contentType from client MIME without prior file signature validation`);
}

if (uploadSource.includes('supabase.storage') && uploadSource.indexOf('validateUploadFileSignature') > uploadSource.indexOf('supabase.storage')) {
  failures.push(`${uploadRoute} validates file signature after storage access; validation must happen before upload`);
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
