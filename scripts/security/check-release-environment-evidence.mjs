import { existsSync, readFileSync } from 'node:fs';

const checklistPath = 'docs/RELEASE_EVIDENCE_CHECKLIST.md';
const failures = [];

const requiredTokens = [
  'Production environment evidence',
  '.env.example',
  'Production environment variables are configured',
  'provider secret store',
  'audit-chain verification evidence',
  'Audit Evidence Packs',
  'protected operational routes',
  'server-side secret',
  'target release tier',
  'values redacted',
  '.env.example policy check output',
  'signing smoke-test output',
];

if (!existsSync(checklistPath)) {
  failures.push(`${checklistPath} is missing`);
} else {
  const source = readFileSync(checklistPath, 'utf8');
  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      failures.push(`${checklistPath} missing required production environment evidence token: ${token}`);
    }
  }
}

console.log('EuroComply release environment evidence check');
console.log('------------------------------------------------');

if (failures.length > 0) {
  console.error('Release environment evidence failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Release environment evidence: ok');
}
