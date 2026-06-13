import { existsSync, readFileSync } from 'node:fs';

const helperPath = 'src/server/security/malware-scan.ts';
const uploadRoutePath = 'src/app/api/documents/upload/route.ts';
const preflightPath = 'scripts/preflight.mjs';

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
const uploadRoute = read(uploadRoutePath);
const preflight = read(preflightPath);

if (helper) {
  requireTokens(helperPath, helper, [
    'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
    'MALWARE_SCANNER_PROVIDER',
    'scanUploadForMalware',
    'shouldBlockUploadForMalwareScan',
    'clean',
    'not_configured',
    'unavailable',
  ]);

  if (!helper.includes('process.env.REQUIRE_MALWARE_SCAN_FOR_UPLOADS')) {
    failures.push(`${helperPath} must read REQUIRE_MALWARE_SCAN_FOR_UPLOADS from environment`);
  }

  if (!helper.includes('return result.required && result.status !==')) {
    failures.push(`${helperPath} must fail closed when upload scanning is required and not clean`);
  }
}

if (uploadRoute) {
  requireTokens(uploadRoutePath, uploadRoute, [
    'scanUploadForMalware',
    'shouldBlockUploadForMalwareScan',
    'document_upload_rejected',
    'scanStatus',
    'scanProvider',
    'scanRequired',
    'scanCheckedAt',
  ]);

  const scanIndex = uploadRoute.indexOf('scanUploadForMalware');
  const storageIndex = uploadRoute.indexOf('.storage.from');
  if (scanIndex === -1 || storageIndex === -1 || scanIndex > storageIndex) {
    failures.push(`${uploadRoutePath} must run content scan before storage upload`);
  }
}

if (preflight) {
  requireTokens(preflightPath, preflight, [
    'src/server/security/malware-scan.ts',
    'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
    'MALWARE_SCANNER_PROVIDER',
  ]);
}

if (failures.length > 0) {
  console.error('Upload content scan failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Upload content scan: ok');
}
