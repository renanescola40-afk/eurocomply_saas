#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { buildReleaseSubprocessEnv, stripProtectedReleaseEnv } from './release-subprocess-env.mjs';

const releaseTarget = String(process.env.RELEASE_TARGET || 'public-production').trim().toLowerCase();
const enterpriseRequested = releaseTarget === 'enterprise' || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true';

function runNodeScript(path, envOverrides = {}) {
  const result = spawnSync(process.execPath, [path], {
    env: buildReleaseSubprocessEnv({ ...process.env, ...envOverrides }),
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
  // The preflight is the only enterprise parent-process consumer of protected
  // configuration. Enterprise final validation consumes retained exact-SHA
  // runtime evidence, so nested install/static/evidence subprocesses must not
  // inherit provider credentials.
  await import('./check-enterprise-release-env.mjs');
  stripProtectedReleaseEnv(process.env);
  await import('./run-public-production-release-v2.mjs');
  runNodeScript('scripts/release/write-enterprise-runtime-evidence.mjs', {
    FINAL_VALIDATION_IN_PROGRESS: 'false',
  });
  runNodeScript('scripts/release/validate-release-go-no-go-evidence.mjs');
  runNodeScript('scripts/release/verify-enterprise-evidence-bundle.mjs');
  await finalizeSecurityResponseEvidence();
} else if (releaseTarget === 'public-production' || releaseTarget === 'production') {
  await import('./check-public-production-release-env.mjs');
  await import('./run-public-production-release-final.mjs');
  stripProtectedReleaseEnv(process.env);
  runNodeScript('scripts/release/write-public-production-go-no-go-evidence.mjs');
  runNodeScript('scripts/release/validate-public-production-go-no-go-evidence.mjs');
  await finalizeSecurityResponseEvidence();
} else {
  console.error(`Unsupported RELEASE_TARGET: ${releaseTarget || '(empty)'}. Expected public-production, production, or enterprise.`);
  process.exitCode = 1;
}
