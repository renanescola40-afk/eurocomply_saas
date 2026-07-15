#!/usr/bin/env node

const releaseTarget = String(process.env.RELEASE_TARGET || 'public-production').trim().toLowerCase();
const enterpriseRequested = releaseTarget === 'enterprise' || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true';

async function verifyRuntimeReleaseSha() {
  await import('./verify-runtime-release-sha.mjs');
}

async function prepareSecurityResponseEvidence() {
  await verifyRuntimeReleaseSha();
  await import('./run-deployment-smoke.mjs');
  const module = await import('./write-security-response-evidence.mjs');
  module.writeSecurityResponseEvidence();
}

if (enterpriseRequested) {
  await import('./check-enterprise-release-env.mjs');
  await prepareSecurityResponseEvidence();
  await import('./run-public-production-release-v2.mjs');
  await verifyRuntimeReleaseSha();
} else if (releaseTarget === 'public-production' || releaseTarget === 'production') {
  await import('./check-public-production-release-env.mjs');
  await prepareSecurityResponseEvidence();
  await import('./run-public-production-release-final.mjs');
  await verifyRuntimeReleaseSha();
} else {
  console.error(`Unsupported RELEASE_TARGET: ${releaseTarget || '(empty)'}. Expected public-production, production, or enterprise.`);
  process.exitCode = 1;
}
