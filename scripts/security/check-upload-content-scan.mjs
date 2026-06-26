import { existsSync, readFileSync } from 'node:fs';

const helperPath = 'src/server/security/' + 'malware-scan.ts';
const uploadSecurityPath = 'src/server/security/upload-security.ts';
const uploadRoutePath = 'src/app/api/documents/upload/route.ts';
const serverActionPath = 'src/server/actions/documents.ts';
const preflightPath = 'scripts/preflight.mjs';
const docPath = 'docs/security/UPLOAD_CONTENT_SCAN.md';
const uploadSecurityDocPath = 'docs/security/UPLOAD_SECURITY.md';
const packagePath = 'package.json';

const aliases = new Map([
  ['scanStatus', ['scan_status']],
  ['scanProvider', ['scan_provider']],
  ['scanRequired', ['scan_required']],
  ['scanCheckedAt', ['scan_checked_at']],
]);
const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function has(source, token) {
  return source.includes(token) || (aliases.get(token) ?? []).some((alias) => source.includes(alias));
}

function requireTokens(path, source, tokens) {
  for (const token of tokens) if (!has(source, token)) failures.push(`${path} missing upload content scan token: ${token}`);
}

function hasFailClosedRequiredScanPolicy(source) {
  return source.includes('return result.required && result.status !==') || source.includes('if (scan.required) return true');
}

console.log('EuroComply upload content scan check');
console.log('-------------------------------------');

const helper = read(helperPath);
const uploadSecurity = read(uploadSecurityPath);
const uploadRoute = read(uploadRoutePath);
const serverAction = read(serverActionPath);
const preflight = read(preflightPath);
const doc = read(docPath);
const uploadSecurityDoc = read(uploadSecurityDocPath);
const packageJson = read(packagePath);

if (helper) {
  requireTokens(helperPath, helper, [
    'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
    'MALWARE_SCANNER_PROVIDER',
    'MALWARE_SCANNER_API_KEY',
    'MalwareScannerProvider',
    'registerMalwareScannerProviderForTest',
    'Mock malware scanner providers are disabled outside test/development',
    'scanUploadForMalware',
    'shouldBlockUploadForMalwareScan',
    'clean',
    'not_configured',
    'unavailable',
    'infected',
    'suspicious',
  ]);

  if (!helper.includes('process.env[REQUIRE_MALWARE_SCAN_ENV]') && !helper.includes('process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS')) failures.push(`${helperPath} must read REQUIRE_MALWARE_SCAN_FOR_UPLOADS from environment`);
  if (!hasFailClosedRequiredScanPolicy(helper)) failures.push(`${helperPath} must fail closed when upload scanning is required and not clean`);
  if (!helper.includes('TEST_ONLY_PROVIDER_NAMES') || !helper.includes('canUseMockProvider')) failures.push(`${helperPath} must keep mock providers test/development only`);
}

if (uploadSecurity) {
  requireTokens(uploadSecurityPath, uploadSecurity, [
    'scanValidatedUploadForMalware',
    'shouldBlockUploadForMalwareScan',
    'buildUploadSecurityAuditMetadata',
    'scanStatus',
    'scanProvider',
    'scanRequired',
    'scanCheckedAt',
    'fileHash',
    'fileSize',
    'mimeDetected',
    'SIGNED_DOCUMENT_URL_EXPIRES_IN_SECONDS',
  ]);
}

if (uploadRoute) {
  requireTokens(uploadRoutePath, uploadRoute, [
    'scanValidatedUploadForMalware',
    'shouldBlockUploadForMalwareScan',
    'uploadRequested',
    'uploadScanned',
    'uploadBlocked',
    'document_upload_rejected',
    'scanStatus',
    'scanProvider',
    'scanRequired',
    'scanCheckedAt',
  ]);

  const scanIndex = uploadRoute.indexOf('scanValidatedUploadForMalware');
  const storageIndex = uploadRoute.indexOf('.storage.from');
  if (scanIndex === -1 || storageIndex === -1 || scanIndex > storageIndex) failures.push(`${uploadRoutePath} must run content scan before storage upload`);
}

if (serverAction) {
  requireTokens(serverActionPath, serverAction, [
    'scanValidatedUploadForMalware',
    'shouldBlockUploadForMalwareScan',
    'uploadScanned',
    'uploadBlocked',
    'scan_status',
    'scan_provider',
    'scan_required',
    'scan_checked_at',
  ]);

  const scanIndex = serverAction.indexOf('scanValidatedUploadForMalware');
  const storageIndex = serverAction.indexOf('.storage.from');
  if (scanIndex === -1 || storageIndex === -1 || scanIndex > storageIndex) failures.push(`${serverActionPath} must run content scan before storage upload`);
}

if (preflight) requireTokens(preflightPath, preflight, ['src/server/security/upload-security.ts', helperPath, 'scripts/security/check-upload-content-scan.mjs', 'docs/security/UPLOAD_SECURITY.md', 'docs/security/UPLOAD_CONTENT_SCAN.md', 'REQUIRE_MALWARE_SCAN_FOR_UPLOADS', 'MALWARE_SCANNER_PROVIDER']);
if (doc) requireTokens(docPath, doc, ['Upload Content Scan Security Standard', 'REQUIRE_MALWARE_SCAN_FOR_UPLOADS', 'MALWARE_SCANNER_PROVIDER', 'advisory', 'fail-closed', 'scanStatus', 'scanProvider', 'scanRequired', 'scanCheckedAt', 'document_upload_rejected', 'Enterprise Release Rule']);
if (uploadSecurityDoc) requireTokens(uploadSecurityDocPath, uploadSecurityDoc, ['Enterprise Upload Security Standard', 'scanner unavailable', 'timeout', 'suspicious', 'clean', 'cross-tenant', 'download_denied']);

if (packageJson && !/"security:ci"\s*:\s*"[^"]*security:upload[^"]*security:upload-content-scan/.test(packageJson) && !/"security:ci"\s*:\s*"[^"]*security:enterprise-api/.test(packageJson)) failures.push(`${packagePath} security:ci must include upload scanning gates directly or through security:enterprise-api so enterprise upload scanning cannot be bypassed`);

if (failures.length > 0) {
  console.error('Upload content scan failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Upload content scan: ok');
}
