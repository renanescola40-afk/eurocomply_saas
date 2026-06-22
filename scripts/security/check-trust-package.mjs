#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const REQUIRED_FILES = [
  'docs/trust/README.md',
  'docs/trust/DPA_DRAFT.md',
  'docs/trust/SUBPROCESSORS.md',
  'docs/trust/RETENTION_POLICY_DRAFT.md',
  'docs/trust/SLA_DRAFT.md',
  'docs/trust/BACKUP_RESTORE_TEST_PLAN.md',
  'docs/trust/DISASTER_RECOVERY_TEST_PLAN.md',
  'docs/trust/PENTEST_READINESS.md',
  'docs/trust/ISO27001_SOC2_READINESS.md',
  'docs/trust/SSO_MFA_ENTERPRISE_PLAN.md',
  'docs/trust/AUDIT_LOG_EXPORT_IMMUTABILITY_PLAN.md',
  'docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md',
  'docs/trust/ENTERPRISE_TRUST_ROADMAP.md',
  'docs/trust/evidence/README.md',
  'docs/trust/evidence/enterprise-trust-evidence.json',
  'scripts/security/check-enterprise-trust-evidence.mjs',
  'docs/trust/SECURITY_OVERVIEW.md',
  'docs/trust/ARCHITECTURE_OVERVIEW.md',
  'docs/trust/DATA_PROTECTION.md',
  'docs/trust/ACCESS_CONTROL.md',
  'docs/trust/ENCRYPTION.md',
  'docs/trust/INCIDENT_RESPONSE.md',
  'docs/trust/BACKUP_AND_RECOVERY.md',
  'docs/trust/SECURITY_FAQ.md',
  'docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md',
  'src/app/[locale]/trust/page.tsx',
];

const REQUIRED_DISCLAIMERS = new Map([
  ['docs/trust/README.md', ['not currently ISO 27001 certified', 'does not currently have a SOC 2']],
  ['docs/trust/DPA_DRAFT.md', ['Status: draft', 'legal review']],
  ['docs/trust/PENTEST_READINESS.md', ['has not completed', 'third-party']],
  ['docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md', ['Do not answer `yes`', 'not currently']],
  ['docs/trust/ENTERPRISE_TRUST_ROADMAP.md', ['Do not claim ISO 27001', 'package-lock.json']],
  ['docs/trust/evidence/README.md', ['Never answer `yes`', 'externally_validated']],
  ['docs/trust/evidence/enterprise-trust-evidence.json', ['internal-trust-evidence', 'Do not represent draft, planned, or partial items as certified']],
  ['scripts/security/check-enterprise-trust-evidence.mjs', ['CLAIMS_REQUIRING_EXTERNAL_EVIDENCE', 'externally_validated']],
  ['docs/trust/SECURITY_OVERVIEW.md', ['designed to support', 'SOC 2', 'ISO 27001', 'renansilva2002@gmail.com']],
  ['docs/trust/ARCHITECTURE_OVERVIEW.md', ['authenticated organization workspaces', 'tenant boundaries', 'release evidence']],
  ['docs/trust/DATA_PROTECTION.md', ['account data', 'Retention', 'customer agreement']],
  ['docs/trust/ACCESS_CONTROL.md', ['RBAC', 'RLS', 'owner']],
  ['docs/trust/ENCRYPTION.md', ['managed providers', 'does not currently claim']],
  ['docs/trust/INCIDENT_RESPONSE.md', ['incident', 'does not currently claim']],
  ['docs/trust/BACKUP_AND_RECOVERY.md', ['backup', 'must not be claimed']],
  ['docs/trust/SUBPROCESSORS.md', ['Vercel', 'Supabase', 'Stripe']],
  ['docs/trust/SECURITY_FAQ.md', ['SOC 2', 'ISO 27001', 'renansilva2002@gmail.com']],
  ['docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md', ['buyer-facing checklist', 'Avoid unavailable claims']],
  ['src/app/[locale]/trust/page.tsx', ['Trust Center', 'SOC 2', 'ISO 27001']],
]);

const failures = [];

for (const relativePath of REQUIRED_FILES) {
  const fullPath = path.join(ROOT_DIR, relativePath);

  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing required trust package artifact`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  if (content.trim().length < 200) {
    failures.push(`${relativePath}: artifact is unexpectedly short`);
  }

  const requiredPhrases = REQUIRED_DISCLAIMERS.get(relativePath) ?? [];
  for (const phrase of requiredPhrases) {
    if (!content.includes(phrase)) {
      failures.push(`${relativePath}: missing required phrase "${phrase}"`);
    }
  }
}

console.log('EuroComply enterprise Trust Center package check');
console.log('------------------------------------------------');

if (failures.length > 0) {
  console.error('Trust package failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Trust package: ok');
