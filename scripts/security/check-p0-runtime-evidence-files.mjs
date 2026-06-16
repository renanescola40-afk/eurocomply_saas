import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = 'docs/security/evidence/runtime';
const allowedItems = new Set([
  'branch-protection-main',
  'required-status-checks',
  'production-secrets-provider-stores',
  'supabase-live-rls-validation',
  'external-security-review-or-pentest',
]);
const redactionText = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const failures = [];

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir);
  return entries
    .map((entry) => join(dir, entry))
    .filter((path) => statSync(path).isFile() && path.endsWith('.json'));
}

function requireString(file, object, key, minLength = 1) {
  if (typeof object[key] !== 'string' || object[key].trim().length < minLength) {
    failures.push(`${file} missing valid string field: ${key}`);
  }
}

function requireArray(file, object, key, minItems = 1) {
  if (!Array.isArray(object[key]) || object[key].length < minItems) {
    failures.push(`${file} missing valid array field: ${key}`);
  }
}

const files = listJsonFiles(evidenceDir);

console.log('EuroComply P0 runtime evidence file check');
console.log('---------------------------------------------');
console.log(`Evidence files found: ${files.length}`);

for (const file of files) {
  let evidence;
  try {
    evidence = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error.message}`);
    continue;
  }

  if (!allowedItems.has(evidence.evidenceItem)) {
    failures.push(`${file} has invalid evidenceItem: ${evidence.evidenceItem}`);
  }

  if (!['Complete', 'Exception'].includes(evidence.status)) {
    failures.push(`${file} has invalid status: ${evidence.status}`);
  }

  requireString(file, evidence, 'reviewer', 3);
  requireString(file, evidence, 'reviewedAt', 10);
  requireString(file, evidence, 'summary', 40);
  requireArray(file, evidence, 'evidenceLocations', 1);

  if (evidence.redactionConfirmation !== redactionText) {
    failures.push(`${file} missing exact redaction confirmation`);
  }

  if (evidence.status === 'Complete') {
    requireArray(file, evidence, 'controlsVerified', 1);
    if (evidence.exception) {
      failures.push(`${file} status Complete must not include exception details`);
    }
  }

  if (evidence.status === 'Exception') {
    const exception = evidence.exception;
    if (!exception || typeof exception !== 'object' || Array.isArray(exception)) {
      failures.push(`${file} status Exception requires exception object`);
    } else {
      requireString(file, exception, 'riskOwner', 3);
      requireString(file, exception, 'rationale', 20);
      requireArray(file, exception, 'compensatingControls', 1);
      requireString(file, exception, 'expiresAt', 10);
      requireString(file, exception, 'approvalReference', 5);
    }
  }
}

if (failures.length > 0) {
  console.error('P0 runtime evidence file failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('P0 runtime evidence files: ok');
}
