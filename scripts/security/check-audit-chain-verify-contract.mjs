import { existsSync, readFileSync } from 'node:fs';

const routePath = 'src/app/api/audit/chain/verify/route.ts';
const testPath = 'src/app/api/audit/chain/verify/route.test.ts';
const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

const route = read(routePath);
const test = read(testPath);

for (const token of [
  'parseAuditChainVerifyLimit',
  'DEFAULT_AUDIT_CHAIN_VERIFY_LIMIT',
  'MAX_AUDIT_CHAIN_VERIFY_LIMIT',
  'invalid_limit',
  'Number.isSafeInteger',
  'noStoreJson',
]) {
  if (!route.includes(token)) failures.push(`${routePath} missing required verifier token: ${token}`);
}

for (const token of ['Math.min(Math.max', 'Math.max(Number(']) {
  if (route.includes(token)) failures.push(`${routePath} still clamps verifier input silently: ${token}`);
}

for (const token of [
  'audit chain verification request contract',
  'uses the default limit',
  'accepts integer limits inside the allowed range',
  'rejects non-integer and ambiguous limits',
  'rejects out-of-range limits',
]) {
  if (!test.includes(token)) failures.push(`${testPath} missing required verifier test token: ${token}`);
}

console.log('EuroComply audit chain verifier contract check');
console.log('------------------------------------------------');

if (failures.length > 0) {
  console.error('Audit chain verifier contract failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Audit chain verifier contract: ok');
}
