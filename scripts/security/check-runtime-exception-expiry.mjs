import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = process.env.RUNTIME_EVIDENCE_DIR?.trim() || 'docs/security/evidence/runtime';
const nowInput = process.env.RUNTIME_EVIDENCE_NOW?.trim();
const now = nowInput ? Date.parse(nowInput) : Date.now();
const failures = [];

if (!Number.isFinite(now)) {
  console.error('Runtime exception expiry validation failed:');
  console.error('- RUNTIME_EVIDENCE_NOW must be a valid ISO-8601 timestamp when provided');
  process.exit(1);
}

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((entry) => join(dir, entry))
    .filter((path) => statSync(path).isFile() && path.endsWith('.json'));
}

for (const file of listJsonFiles(evidenceDir)) {
  let evidence;
  try {
    evidence = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    failures.push(`${file} is not valid JSON`);
    continue;
  }

  if (evidence.status !== 'Exception') continue;

  const expiresAt = evidence.exception?.expiresAt;
  if (typeof expiresAt !== 'string' || expiresAt.trim() === '') {
    failures.push(`${file} Exception evidence is missing exception.expiresAt`);
    continue;
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    failures.push(`${file} Exception evidence has invalid exception.expiresAt`);
    continue;
  }

  if (expiresAtMs <= now) {
    failures.push(`${file} Exception evidence expired at ${expiresAt}`);
  }
}

if (failures.length > 0) {
  console.error('Runtime exception expiry validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Runtime exception expiry validation passed for ${evidenceDir}.`);
