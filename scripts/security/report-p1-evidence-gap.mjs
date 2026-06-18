#!/usr/bin/env node
import fs from 'node:fs';

const strict = process.argv.includes('--strict');

const evidenceFiles = [
  ['P1-01 SSO/SAML/OIDC', 'docs/security/evidence/p1/sso-saml-oidc.json'],
  ['P1-02 Admin MFA', 'docs/security/evidence/p1/admin-mfa-required.json'],
  ['P1-03 Step-up', 'docs/security/evidence/p1/step-up-sensitive-actions.json'],
  ['P1-04 Rate limit', 'docs/security/evidence/p1/distributed-rate-limit-sensitive-endpoints.json'],
  ['P1-05 DAST', 'docs/security/evidence/p1/dast-automated.json'],
  ['P1-06 SBOM attestation', 'docs/security/evidence/p1/sbom-artifact-attestation.json'],
  ['P1-07 Backup restore', 'docs/security/evidence/p1/backup-restore-tested.json'],
  ['P1-08 Logging alerts', 'docs/security/evidence/p1/centralized-logging-alerts.json'],
  ['P1-09 Audit chain', 'docs/security/evidence/p1/verifiable-production-audit-chain.json'],
  ['P1-10 Edge protection', 'docs/security/evidence/p1/waf-cdn-ddos.json'],
];

let present = 0;
const missing = [];

for (const [label, file] of evidenceFiles) {
  if (fs.existsSync(file)) {
    present += 1;
    console.log(`[p1-evidence-gap] present: ${label} -> ${file}`);
  } else {
    missing.push([label, file]);
    console.log(`[p1-evidence-gap] missing: ${label} -> ${file}`);
  }
}

const total = evidenceFiles.length;
const percent = Math.round((present / total) * 100);
console.log(`[p1-evidence-gap] final evidence present: ${present}/${total} = ${percent}%`);
console.log(`[p1-evidence-gap] final evidence missing: ${missing.length}/${total} = ${100 - percent}%`);

if (strict && missing.length > 0) {
  console.error('[p1-evidence-gap] strict mode failed. Missing final evidence files:');
  for (const [label, file] of missing) {
    console.error(`- ${label}: ${file}`);
  }
  process.exit(1);
}
