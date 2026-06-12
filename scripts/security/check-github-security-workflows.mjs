import { existsSync, readFileSync } from 'node:fs';

const checks = [
  {
    path: '.github/workflows/codeql.yml',
    tokens: [
      'github/codeql-action/init@v3',
      'github/codeql-action/analyze@v3',
      'security-extended',
      'security-and-quality',
      'security-events: write',
      'javascript-typescript',
    ],
  },
  {
    path: '.github/workflows/dependency-review.yml',
    tokens: [
      'actions/dependency-review-action@v4',
      'fail-on-severity: high',
      'deny-licenses',
      'AGPL-3.0',
      'pull_request',
    ],
  },
  {
    path: '.github/workflows/security-ci.yml',
    tokens: [
      'npm install --ignore-scripts',
      'npm run security:ci',
      'node scripts/security/check-step-up.mjs',
      'actions/setup-node@v4',
      'node-version: 22',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'AUDIT_CHAIN_SIGNING_SECRET',
      'EVIDENCE_PACK_SIGNING_SECRET',
      'timeout-minutes: 25',
      'cancel-in-progress: true',
    ],
  },
];

const failures = [];

for (const check of checks) {
  if (!existsSync(check.path)) {
    failures.push(`${check.path} is missing`);
    continue;
  }

  const source = readFileSync(check.path, 'utf8');
  for (const token of check.tokens) {
    if (!source.includes(token)) {
      failures.push(`${check.path} missing required workflow token: ${token}`);
    }
  }
}

console.log('EuroComply GitHub security workflow check');
console.log('-----------------------------------------');

if (failures.length > 0) {
  console.error('GitHub security workflow failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('GitHub security workflows: ok');
}
