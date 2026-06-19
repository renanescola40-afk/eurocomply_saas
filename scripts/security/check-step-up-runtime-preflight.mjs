#!/usr/bin/env node

console.log('EuroComply step-up runtime provider preflight');
console.log('------------------------------------------------');
console.log('Running the enterprise release gate with runtime provider checks enabled.');
console.log('Values are never printed; the underlying gate only reports configured/missing failures.');

const originalEnterpriseRelease = process.env.EUROCOMPLY_ENTERPRISE_RELEASE;
process.env.EUROCOMPLY_ENTERPRISE_RELEASE = 'true';

try {
  await import('./check-step-up.mjs');
} finally {
  if (typeof originalEnterpriseRelease === 'undefined') {
    delete process.env.EUROCOMPLY_ENTERPRISE_RELEASE;
  } else {
    process.env.EUROCOMPLY_ENTERPRISE_RELEASE = originalEnterpriseRelease;
  }
}
