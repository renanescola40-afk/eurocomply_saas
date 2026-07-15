#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const releaseTarget = String(process.env.RELEASE_TARGET || 'public-production').trim().toLowerCase();
const enterpriseRequested = releaseTarget === 'enterprise' || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true';

function runNodeScript(path) {
  const result = spawnSync(process.execPath, [path], {
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path} failed with exit status ${result.status ?? 'unknown'}.`);
  }
}

function verifyRuntimeReleaseSha() {
  runNodeScript('scripts/release/verify-runtime-release-sha.mjs');
}

async function prepareSecurityResponseEvidence() {
  verifyRuntimeReleaseSha();
  runNodeScript('scripts/release/run-deployment-smoke.mjs');
  const module = await import('./write-security-response-evidence.mjs');
  module.writeSecurityResponseEvidence();
}

if (enterpriseRequested) {
  await import('./check-enterprise-release-env.mjs');
  await prepareSecurityResponseEvidence();
  await import('./run-public-production-release-v2.mjs');
  verifyRuntimeReleaseSha();
} else if (releaseTarget === 'public-production' || releaseTarget === 'production') {
  await import('./check-public-production-release-env.mjs');
  await prepareSecurityResponseEvidence();
  await import('./run-public-production-release-final.mjs');
  verifyRuntimeReleaseSha();
} else {
  console.error(`Unsupported RELEASE_TARGET: ${releaseTarget || '(empty)'}. Expected public-production, production, or enterprise.`);
  process.exitCode = 1;
}
