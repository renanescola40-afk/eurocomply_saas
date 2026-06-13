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
  'docs/trust/evidence/enterprise-trust-evidence.json',
  'scripts/security/check-enterprise-trust-evidence.mjs',
];

const REQUIRED_DISCLAIMERS = new Map([
  ['docs/trust/README.md', ['not currently ISO 27001 certified', 'does not currently have a SOC 2']],
  ['docs/trust/DPA_DRAFT.md', ['Status: draft', 'legal review']],
  ['docs/trust/PENTEST_READINESS.md', ['has not completed', 'third-party']],
  ['docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md', ['Do not answer `yes`', 'not currently']],
  ['docs/trust/ENTERPRISE_TRUST_ROADMAP.md', ['Do not claim ISO 27001', 'package-lock.json']],
  ['docs/trust/evidence/enterprise-trust-evidence.json', ['internal-trust-evidence', 'Do not represent draft, planned, or partial items as certified']],
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

  const requiredPhrases = REQUIRED_DISCLAIMERS.get(relativePath) ?? [];
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
