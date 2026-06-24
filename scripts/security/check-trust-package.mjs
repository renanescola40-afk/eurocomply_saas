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
  'docs/trust/PROCUREMENT_CHECKLIST.md',
  'src/app/[locale]/trust/page.tsx',
  'src/app/[locale]/security/page.tsx',
  'src/components/marketing/public-footer.tsx',
  'src/components/marketing/enterprise-home.tsx',
  'src/app/[locale]/pricing/page.tsx',
  'SECURITY.md',
  'docs/RELEASE_EVIDENCE_CHECKLIST.md',
];

const REQUIRED_PHRASES = new Map([
  ['docs/trust/SECURITY_OVERVIEW.md', ['designed to support', 'SOC 2', 'ISO 27001', 'RBAC', 'RLS', 'audit', 'renansilva2002@gmail.com']],
  ['docs/trust/ARCHITECTURE_OVERVIEW.md', ['Next.js', 'Supabase', 'designed to support']],
  ['docs/trust/DATA_PROTECTION.md', ['Retention', 'Subprocessors', 'sensitive configuration', 'designed']],
  ['docs/trust/ACCESS_CONTROL.md', ['RBAC', 'RLS', 'owner', 'viewer']],
  ['docs/trust/ENCRYPTION.md', ['Encryption in transit', 'Provider evidence', 'Sensitive configuration']],
  ['docs/trust/INCIDENT_RESPONSE.md', ['renansilva2002@gmail.com', 'incident', 'triage']],
  ['docs/trust/BACKUP_AND_RECOVERY.md', ['managed continuity', 'provider evidence']],
  ['docs/trust/SUBPROCESSORS.md', ['Vercel', 'Supabase', 'Stripe']],
  ['docs/trust/SECURITY_FAQ.md', ['SOC 2', 'ISO 27001', 'renansilva2002@gmail.com']],
  ['docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md', ['Procurement checklist', 'designed to support']],
  ['docs/trust/PROCUREMENT_CHECKLIST.md', ['Enterprise procurement checklist', 'auth', 'RBAC', 'RLS', 'audit logs', 'data retention', 'responsible disclosure']],
  ['src/app/[locale]/trust/page.tsx', ['Trust Center', 'SOC 2', 'ISO 27001', 'Procurement checklist']],
  ['src/app/[locale]/security/page.tsx', ['Security at Risck comply', 'RBAC', 'RLS', 'renansilva2002@gmail.com']],
  ['src/components/marketing/public-footer.tsx', ['/trust', '/security']],
  ['src/components/marketing/enterprise-home.tsx', ['/trust', 'Trust Center']],
  ['src/app/[locale]/pricing/page.tsx', ['/trust', 'Trust Center']],
  ['SECURITY.md', ['renansilva2002@gmail.com', 'Claims guardrail']],
  ['docs/RELEASE_EVIDENCE_CHECKLIST.md', ['Trust Center readiness']],
]);

const FALSE_CLAIM_PATTERNS = [
  { label: 'SOC 2 compliant/certified claim', pattern: /SOC\s*2[^\n]*(compliant|certified|attested|passed)/i },
  { label: 'ISO 27001 certified claim', pattern: /ISO\s*27001[^\n]*(certified|compliant|passed)/i },
  { label: 'completed external test claim', pattern: /(completed|passed|finished)[^\n]*(third-party|external)[^\n]*(penetration|security)\s+test/i },
  { label: 'end-to-end encryption claim', pattern: /end-to-end encrypted/i },
  { label: 'WORM immutable audit log claim', pattern: /(WORM-backed|immutable audit log)/i },
  { label: '24/7 monitoring claim', pattern: /24\/7[^\n]*(monitored|monitoring|staffed)/i },
];

const SAFE_NEGATION_CONTEXT = /(not currently|does not currently|must not|do not|unless|non-claim|non-claims|not claimed|não afirma|no afirma|ne revendique pas|non dichiara|beansprucht derzeit weder)/i;

const failures = [];

function readRequiredFile(relativePath) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing required Trust Center artifact`);
    return null;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.trim().length < 100) {
    failures.push(`${relativePath}: artifact is unexpectedly short`);
  }

  return content;
}

for (const relativePath of REQUIRED_FILES) {
  const content = readRequiredFile(relativePath);
  if (!content) continue;

  for (const phrase of REQUIRED_PHRASES.get(relativePath) ?? []) {
    if (!content.includes(phrase)) {
      failures.push(`${relativePath}: missing required phrase "${phrase}"`);
    }
  }

  content.split('\n').forEach((line, index) => {
    for (const { label, pattern } of FALSE_CLAIM_PATTERNS) {
      if (pattern.test(line) && !SAFE_NEGATION_CONTEXT.test(line)) {
        failures.push(`${relativePath}:${index + 1}: possible unsupported ${label}`);
      }
    }
  });
}

console.log('Risck comply enterprise Trust Center package check');
console.log('--------------------------------------------------');

if (failures.length > 0) {
  console.error('Trust package failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Trust package: ok');
