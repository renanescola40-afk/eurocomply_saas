#!/usr/bin/env node

console.log('RISCK COMPLY step-up runtime provider preflight');
console.log('------------------------------------------------');
console.log('Running the enterprise release gate with runtime provider checks enabled.');
console.log('Values are never printed; the underlying gate only reports configured/missing failures.');

const originalRisckEnterpriseRelease = process.env.RISCK_COMPLY_ENTERPRISE_RELEASE;
const originalLegacyEnterpriseRelease = process.env.EUROCOMPLY_ENTERPRISE_RELEASE;
process.env.RISCK_COMPLY_ENTERPRISE_RELEASE = 'true';
process.env.EUROCOMPLY_ENTERPRISE_RELEASE = 'true';

try {
  await import('./check-step-up.mjs');
} finally {
  if (typeof originalRisckEnterpriseRelease === 'undefined') {
    delete process.env.RISCK_COMPLY_ENTERPRISE_RELEASE;
  } else {
    process.env.RISCK_COMPLY_ENTERPRISE_RELEASE = originalRisckEnterpriseRelease;
  }

  if (typeof originalLegacyEnterpriseRelease === 'undefined') {
    delete process.env.EUROCOMPLY_ENTERPRISE_RELEASE;
  } else {
    process.env.EUROCOMPLY_ENTERPRISE_RELEASE = originalLegacyEnterpriseRelease;
  }
}
