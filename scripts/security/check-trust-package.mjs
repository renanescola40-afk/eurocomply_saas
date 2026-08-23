#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SECURITY_EMAIL = 'comercial@risckcomply.com';
const UNVERIFIED_SECURITY_EMAIL = 'security@risckcomply.com';
const PERSONAL_MAILBOX_PATTERN = /[A-Z0-9._%+-]+@gmail\.com/i;
const STATUS_URL = 'https://risckcomplystatus1.statuspage.io/';

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
  'src/app/[locale]/status/page.tsx',
  'src/app/[locale]/[trustPage]/page.tsx',
  'src/lib/trust-center/verified-authority.ts',
  'src/components/marketing/verified-status-page.tsx',
  'src/components/marketing/public-footer.tsx',
  'src/components/marketing/enterprise-home.tsx',
  'src/app/[locale]/pricing/page.tsx',
  'SECURITY.md',
  'docs/RELEASE_EVIDENCE_CHECKLIST.md',
];

const REQUIRED_PHRASES = new Map([
  ['docs/trust/SECURITY_OVERVIEW.md', ['designed to support', 'SOC 2', 'ISO 27001', 'RBAC', 'RLS', 'audit', SECURITY_EMAIL, STATUS_URL]],
  ['docs/trust/ARCHITECTURE_OVERVIEW.md', ['Next.js', 'Supabase', 'designed to support']],
  ['docs/trust/DATA_PROTECTION.md', ['Retention', 'Subprocessors', 'sensitive configuration', 'designed']],
  ['docs/trust/ACCESS_CONTROL.md', ['RBAC', 'RLS', 'owner', 'viewer']],
  ['docs/trust/ENCRYPTION.md', ['Encryption in transit', 'Provider evidence', 'Sensitive configuration', SECURITY_EMAIL]],
  ['docs/trust/INCIDENT_RESPONSE.md', [SECURITY_EMAIL, STATUS_URL, 'incident', 'triage']],
  ['docs/trust/BACKUP_AND_RECOVERY.md', ['managed continuity', 'provider evidence']],
  ['docs/trust/SUBPROCESSORS.md', ['Vercel', 'Supabase', 'Stripe']],
  ['docs/trust/SECURITY_FAQ.md', ['SOC 2', 'ISO 27001', SECURITY_EMAIL, STATUS_URL]],
  ['docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md', ['Procurement checklist', 'designed to support', SECURITY_EMAIL, STATUS_URL]],
  ['docs/trust/PROCUREMENT_CHECKLIST.md', ['Enterprise procurement checklist', 'Authentication', 'RBAC', 'RLS', 'Audit logs', 'Data retention', 'Responsible disclosure', SECURITY_EMAIL, STATUS_URL]],
  ['src/app/[locale]/trust/page.tsx', ['TrustCenterPage', 'applyVerifiedTrustAuthority', "getLocalizedTrustCenterPage('trust'" ]],
  ['src/app/[locale]/security/page.tsx', ['TrustCenterPage', 'applyVerifiedTrustAuthority', "getLocalizedTrustCenterPage('security'" ]],
  ['src/app/[locale]/status/page.tsx', ['VerifiedStatusPage']],
  ['src/app/[locale]/[trustPage]/page.tsx', ['applyVerifiedTrustAuthority', 'getLocalizedTrustCenterPage']],
  ['src/lib/trust-center/verified-authority.ts', ['VERIFIED_SECURITY_EMAIL', SECURITY_EMAIL, 'VERIFIED_STATUS_PAGE_URL', STATUS_URL]],
  ['src/components/marketing/verified-status-page.tsx', ['VERIFIED_STATUS_PAGE_URL', 'Open live status']],
  ['src/components/marketing/public-footer.tsx', ['/trust', '/security']],
  ['src/components/marketing/enterprise-home.tsx', ['/trust', 'Trust Center']],
  ['src/app/[locale]/pricing/page.tsx', ['/trust', 'Trust Center']],
  ['SECURITY.md', [SECURITY_EMAIL, 'Claims guardrail']],
  ['docs/RELEASE_EVIDENCE_CHECKLIST.md', ['Trust Center readiness']],
]);

const CANONICAL_SECURITY_AUTHORITY_FILES = [
  'SECURITY.md',
  'docs/trust/SECURITY_OVERVIEW.md',
  'docs/trust/ENCRYPTION.md',
  'docs/trust/INCIDENT_RESPONSE.md',
  'docs/trust/SECURITY_FAQ.md',
  'docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md',
  'docs/trust/PROCUREMENT_CHECKLIST.md',
  'src/app/[locale]/trust/page.tsx',
  'src/app/[locale]/security/page.tsx',
  'src/app/[locale]/[trustPage]/page.tsx',
  'src/lib/trust-center/verified-authority.ts',
];

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
const contents = new Map();

function readRequiredFile(relativePath) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing required Trust Center artifact`);
    return null;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  contents.set(relativePath, content);
  if (content.trim().length < 100) failures.push(`${relativePath}: artifact is unexpectedly short`);
  return content;
}

for (const relativePath of REQUIRED_FILES) {
  const content = readRequiredFile(relativePath);
  if (!content) continue;

  for (const phrase of REQUIRED_PHRASES.get(relativePath) ?? []) {
    if (!content.includes(phrase)) failures.push(`${relativePath}: missing required phrase "${phrase}"`);
  }

  content.split('\n').forEach((line, index) => {
    for (const { label, pattern } of FALSE_CLAIM_PATTERNS) {
      if (pattern.test(line) && !SAFE_NEGATION_CONTEXT.test(line)) {
        failures.push(`${relativePath}:${index + 1}: possible unsupported ${label}`);
      }
    }
  });
}

for (const relativePath of CANONICAL_SECURITY_AUTHORITY_FILES) {
  const content = contents.get(relativePath) ?? readRequiredFile(relativePath);
  if (!content) continue;
  if (content.includes(UNVERIFIED_SECURITY_EMAIL)) {
    failures.push(`${relativePath}: unverified dedicated security mailbox must not be a current authority`);
  }
  if (PERSONAL_MAILBOX_PATTERN.test(content)) {
    failures.push(`${relativePath}: personal free-mail address must not be a current public security-reporting authority`);
  }
}

console.log('RISCK COMPLY enterprise Trust Center package check');
console.log('--------------------------------------------------');

if (failures.length > 0) {
  console.error('Trust package failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Trust package: ok');
