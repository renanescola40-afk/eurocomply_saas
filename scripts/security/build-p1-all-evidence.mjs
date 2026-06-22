#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const scripts = [
  'scripts/security/build-p1-identity-access-evidence.mjs',
  'scripts/security/build-p1-admin-mfa-evidence.mjs',
  'scripts/security/build-p1-step-up-evidence.mjs',
  'scripts/security/build-p1-rate-limit-evidence.mjs',
  'scripts/security/build-p1-dast-evidence.mjs',
  'scripts/security/build-p1-sbom-attestation-evidence.mjs',
  'scripts/security/build-p1-restore-test-evidence.mjs',
  'scripts/security/build-p1-centralized-logging-evidence.mjs',
  'scripts/security/build-p1-audit-chain-evidence.mjs',
  'scripts/security/build-p1-edge-protection-evidence.mjs',
];

let failures = 0;

for (const script of scripts) {
  console.log(`[p1-all-builder] ${script}`);
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) {
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`[p1-all-builder] ${failures} builder(s) failed`);
  process.exit(1);
}

console.log('[p1-all-builder] done');
