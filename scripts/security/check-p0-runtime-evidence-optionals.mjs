#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const checks = [
  'scripts/security/check-p0-production-secrets-evidence.mjs',
  'scripts/security/check-p0-supabase-rls-evidence.mjs',
  'scripts/security/check-p0-external-review-evidence.mjs',
];

let failed = false;

for (const check of checks) {
  console.log(`Running ${check}`);
  const result = spawnSync(process.execPath, [check], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  console.error('One or more optional P0 runtime evidence checks failed.');
  process.exit(1);
}

console.log('Optional P0 runtime evidence checks passed.');
