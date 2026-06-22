#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const REQUIRED_FILES = [
  'docs/trust/README.md',
  'docs/trust/SECURITY_OVERVIEW.md',
  'docs/trust/ARCHITECTURE_OVERVIEW.md',
  'docs/trust/DATA_PROTECTION.md',
  'docs/trust/ACCESS_CONTROL.md',
  'docs/trust/ENCRYPTION.md',
  'docs/trust/INCIDENT_RESPONSE.md',
  'docs/trust/BACKUP_AND_RECOVERY.md',
  'docs/trust/SUBPROCESSORS.md',
  'docs/trust/SECURITY_FAQ.md',
  'docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md',
  'docs/trust/DPA_DRAFT.md',
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
  'docs/RELEASE_EVIDENCE_CHECKLIST.md',
  'SECURITY.md',
  'src/app/[locale]/trust/page.tsx',
  'src/app/[locale]/security/page.tsx',
  'src/app/[locale]/pricing/page.tsx',
  'src/components/marketing/enterprise-home.tsx',
  'src/components/marketing/public-info-page.tsx',
  'src/components/marketing/public-footer.tsx',
  'scripts/security/check-enterprise-trust-evidence.mjs',
];

const REQUIRED_PHRASES = new Map([
  ['docs/trust/README.md', ['not currently ISO 27001 certified', 'does not currently have a SOC 2']],
  ['docs/trust/SECURITY_OVERVIEW.md', ['not currently ISO 27001 certified', 'does not currently have a SOC 2', 'renansilva2002@gmail.com']],
  ['docs/trust/ARCHITECTURE_OVERVIEW.md', ['trust boundaries', 'designed to support enterprise review']],
  ['docs/trust/DATA_PROTECTION.md', ['Data categories', 'Retention', 'Customer-safe answers']],
  ['docs/trust/ACCESS_CONTROL.md', ['owner', 'admin', 'editor', 'member', 'viewer']],
  ['docs/trust/ENCRYPTION.md', ['does not currently offer end-to-end encryption', 'provider-managed encryption']],
  ['docs/trust/INCIDENT_RESPONSE.md', ['renansilva2002@gmail.com', 'not a contractual SLA']],
  ['docs/trust/BACKUP_AND_RECOVERY.md', ['formal restore exercise has not yet been completed', 'No contractual RTO or RPO']],
  ['docs/trust/SUBPROCESSORS.md', ['draft operational register', 'Do not claim']],
  ['docs/trust/SECURITY_FAQ.md', ['does not currently have a SOC 2', 'not currently ISO 27001 certified']],
  ['docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md', ['Procurement checklist', 'Banned procurement claims']],
  ['docs/trust/DPA_DRAFT.md', ['Status: draft', 'legal review']],
  ['docs/trust/PENTEST_READINESS.md', ['has not completed', 'third-party']],
  ['docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md', ['Do not answer `yes`', 'not currently']],
  ['docs/trust/ENTERPRISE_TRUST_ROADMAP.md', ['Do not claim ISO 27001', 'package-lock.json']],
  ['docs/trust/evidence/README.md', ['Never answer `yes`', 'externally_validated']],
  ['docs/trust/evidence/enterprise-trust-evidence.json', ['internal-trust-evidence', 'Do not represent draft, planned, or partial items as certified']],
  ['docs/RELEASE_EVIDENCE_CHECKLIST.md', ['Trust Center readiness evidence', 'npm run security:trust-package']],
  ['SECURITY.md', ['renansilva2002@gmail.com', 'Claims guardrail']],
  ['src/app/[locale]/trust/page.tsx', ['Trust Center', 'not currently ISO 27001 certified', 'does not currently have a SOC 2 report']],
  ['src/app/[locale]/security/page.tsx', ['Responsible disclosure', 'renansilva2002@gmail.com']],
  ['src/app/[locale]/pricing/page.tsx', ['Trust Center', 'Honest claims']],
  ['src/components/marketing/enterprise-home.tsx', ['Trust Center', 'evidence-bound']],
  ['src/components/marketing/public-info-page.tsx', ['Trust Center', 'renansilva2002@gmail.com']],
  ['src/components/marketing/public-footer.tsx', ['/trust', '/security']],
  ['scripts/security/check-enterprise-trust-evidence.mjs', ['CLAIMS_REQUIRING_EXTERNAL_EVIDENCE', 'externally_validated']],
]);

const failures = [];

for (const relativePath of REQUIRED_FILES) {
  const fullPath = path.join(ROOT_DIR, relativePath);

  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing required trust package document`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  if (content.trim().length < 200) {
    failures.push(`${relativePath}: document is unexpectedly short`);
  }

  const requiredPhrases = REQUIRED_PHRASES.get(relativePath) ?? [];
  for (const phrase of requiredPhrases) {
    if (!content.includes(phrase)) {
      failures.push(`${relativePath}: missing required phrase "${phrase}"`);
    }
  }
}

console.log('EuroComply trust package check');
console.log('--------------------------------');

if (failures.length > 0) {
  console.error('Trust package failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Trust package: ok');
