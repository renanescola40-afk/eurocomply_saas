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

async function finalizeSecurityResponseEvidence() {
  verifyRuntimeReleaseSha();
  const writer = await import('./write-security-response-evidence.mjs');
  const finalEvidence = await import('./record-security-response-final-evidence.mjs');

  try {
    writer.writeSecurityResponseEvidence();
    finalEvidence.recordSecurityResponseFinalEvidence({ passed: true });
  } catch (error) {
    try {
      finalEvidence.recordSecurityResponseFinalEvidence({ passed: false });
    } catch (patchError) {
      console.error(
        `Unable to mark final validation evidence as failed: ${patchError instanceof Error ? patchError.message : 'unknown_error'}`,
      );
    }
    throw error;
  }
}

if (enterpriseRequested) {
  await import('./check-enterprise-release-env.mjs');
  await import('./run-public-production-release-v2.mjs');
  await finalizeSecurityResponseEvidence();
} else if (releaseTarget === 'public-production' || releaseTarget === 'production') {
  await import('./check-public-production-release-env.mjs');
  await import('./run-public-production-release-final.mjs');
  await finalizeSecurityResponseEvidence();
} else {
  console.error(`Unsupported RELEASE_TARGET: ${releaseTarget || '(empty)'}. Expected public-production, production, or enterprise.`);
  process.exitCode = 1;
}
