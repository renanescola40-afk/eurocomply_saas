#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const REQUIRED_FILES = [
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
  'src/app/[locale]/trust/page.tsx',
  'src/app/[locale]/security/page.tsx',
  'src/components/marketing/public-footer.tsx',
  'SECURITY.md',
  'docs/RELEASE_EVIDENCE_CHECKLIST.md',
];

const REQUIRED_PHRASES = new Map([
  ['docs/trust/SECURITY_OVERVIEW.md', ['designed to support', 'SOC 2', 'ISO 27001', 'renansilva2002@gmail.com']],
  ['docs/trust/ARCHITECTURE_OVERVIEW.md', ['Next.js', 'Supabase', 'designed to support']],
  ['docs/trust/DATA_PROTECTION.md', ['Retention', 'Subprocessors', 'designed']],
  ['docs/trust/ACCESS_CONTROL.md', ['RBAC', 'RLS', 'owner']],
  ['docs/trust/ENCRYPTION.md', ['provider', 'evidence']],
  ['docs/trust/INCIDENT_RESPONSE.md', ['renansilva2002@gmail.com', 'incident']],
  ['docs/trust/BACKUP_AND_RECOVERY.md', ['restore', 'RTO', 'RPO']],
  ['docs/trust/SUBPROCESSORS.md', ['Vercel', 'Supabase', 'Stripe']],
  ['docs/trust/SECURITY_FAQ.md', ['SOC 2', 'ISO 27001', 'renansilva2002@gmail.com']],
  ['docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md', ['Procurement checklist', 'designed to support']],
  ['src/app/[locale]/trust/page.tsx', ['Trust Center', 'SOC 2', 'ISO 27001']],
  ['src/app/[locale]/security/page.tsx', ['Security at EuroComply', 'renansilva2002@gmail.com']],
  ['src/components/marketing/public-footer.tsx', ['/trust']],
  ['SECURITY.md', ['renansilva2002@gmail.com']],
  ['docs/RELEASE_EVIDENCE_CHECKLIST.md', ['Trust Center readiness']],
]);

const failures = [];

for (const relativePath of REQUIRED_FILES) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing required Trust Center artifact`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.trim().length < 100) {
    failures.push(`${relativePath}: artifact is unexpectedly short`);
  }

  for (const phrase of REQUIRED_PHRASES.get(relativePath) ?? []) {
    if (!content.includes(phrase)) {
      failures.push(`${relativePath}: missing required phrase "${phrase}"`);
    }
  }
}

console.log('EuroComply enterprise Trust Center package check');
console.log('------------------------------------------------');

if (failures.length > 0) {
  console.error('Trust package failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Trust package: ok');
