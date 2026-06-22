import { existsSync, readFileSync } from 'node:fs';

const ROUTE_PATH = 'src/app/api/audit/evidence-pack/verify/route.ts';
const TEST_PATH = 'src/app/api/audit/evidence-pack/verify/route.test.ts';

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing.`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function requireToken(source, token, message) {
  if (!source.includes(token)) failures.push(message);
}

function forbidToken(source, token, message) {
  if (source.includes(token)) failures.push(message);
}

console.log('EuroComply public verifier security check');
console.log('--------------------------------------------');

const route = read(ROUTE_PATH);
const test = read(TEST_PATH);

requireToken(route, 'checkDistributedRateLimit', `${ROUTE_PATH} must keep a distributed rate limit.`);
requireToken(route, 'rateLimitResponse', `${ROUTE_PATH} must use the standard fail-closed rate-limit response.`);
requireToken(route, 'noStoreJson', `${ROUTE_PATH} must use no-store JSON responses on every path.`);
requireToken(route, 'MAX_EVIDENCE_PACK_BYTES', `${ROUTE_PATH} must define a bounded request size for public verification.`);
requireToken(route, 'isJsonContentType', `${ROUTE_PATH} must validate JSON content type before parsing.`);
requireToken(route, 'getEvidencePackContentLength', `${ROUTE_PATH} must reject oversized content-length values before parsing.`);
requireToken(route, 'readBoundedEvidencePackExport', `${ROUTE_PATH} must centralize bounded body parsing.`);
requireToken(route, 'invalid_evidence_pack_export', `${ROUTE_PATH} must return stable public error codes for invalid exports.`);
requireToken(route, 'verification_failed', `${ROUTE_PATH} must return stable public error codes for verification failures.`);

forbidToken(route, 'NextResponse.json', `${ROUTE_PATH} must not bypass noStoreJson.`);
forbidToken(route, 'request.json()', `${ROUTE_PATH} must not parse unbounded public verifier bodies.`);
forbidToken(route, 'Invalid evidence pack export format.', `${ROUTE_PATH} must not return prose parser errors.`);
forbidToken(route, 'Unable to verify evidence pack.', `${ROUTE_PATH} must not return prose verification errors.`);

requireToken(test, 'rejects oversized bodies before parsing', `${TEST_PATH} must cover oversized body rejection.`);
requireToken(test, 'accepts JSON content types only', `${TEST_PATH} must cover content-type validation.`);
requireToken(test, 'reads valid bounded evidence pack exports', `${TEST_PATH} must cover bounded valid exports.`);

if (failures.length > 0) {
  console.error('Public verifier security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Public verifier security: ok');
}
