import { existsSync, readFileSync } from 'node:fs';

const helperPath = 'src/server/security/audit-chain.ts';
const testPath = 'src/server/security/audit-chain.test.ts';

const helperRequiredTokens = [
  'canonicalizeAuditEvent',
  'buildAuditEventHash',
  'signAuditEventHash',
  'buildAuditChainRecord',
  'verifyAuditChain',
  'createHash',
  'createHmac',
  'sha256',
  'previousHash',
  'eventHash',
  'AUDIT_CHAIN_SIGNING_SECRET',
  'previous_hash_mismatch',
  'event_hash_mismatch',
  'signature_mismatch',
];

const testRequiredTokens = [
  'canonicalizes metadata deterministically',
  'builds deterministic hashes',
  'changes the hash when metadata changes',
  'verifies a valid hash chain',
  'detects previous hash tampering',
  'detects event content tampering',
  'signs hashes when an audit chain secret is configured',
];

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
      failures.push(`${path} missing audit-chain token: ${token}`);
    }
  }
}

console.log('EuroComply audit chain security check');
console.log('-------------------------------------');

const helper = read(helperPath);
const test = read(testPath);

if (helper) requireTokens(helperPath, helper, helperRequiredTokens);
if (test) requireTokens(testPath, test, testRequiredTokens);

if (helper && !helper.includes('.sort(([left], [right]) => left.localeCompare(right))')) {
  failures.push(`${helperPath} must sort object keys during canonicalization`);
}

if (helper && helper.includes('Math.random')) {
  failures.push(`${helperPath} must not use random values when building deterministic hashes`);
}

if (helper && helper.includes('new Date()')) {
  failures.push(`${helperPath} must not introduce current timestamps when building deterministic hashes`);
}

if (failures.length > 0) {
  console.error('Audit chain security failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Audit chain security: ok');
}
