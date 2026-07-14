#!/usr/bin/env node

const releaseTarget = String(process.env.RELEASE_TARGET || 'public-production').trim().toLowerCase();
const enterpriseRequested = releaseTarget === 'enterprise' || process.env.RISCK_COMPLY_ENTERPRISE_RELEASE === 'true';

if (enterpriseRequested) {
  await import('./check-enterprise-release-env.mjs');
  await import('./run-public-production-release-v2.mjs');
} else if (releaseTarget === 'public-production' || releaseTarget === 'production') {
  await import('./check-public-production-release-env.mjs');
  await import('./run-public-production-release-final.mjs');
} else {
  console.error(`Unsupported RELEASE_TARGET: ${releaseTarget || '(empty)'}. Expected public-production, production, or enterprise.`);
  process.exitCode = 1;
}
