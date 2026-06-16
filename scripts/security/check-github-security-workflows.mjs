import { existsSync, readFileSync } from 'node:fs';

const checks = [
  {
    path: '.github/workflows/codeql.yml',
    tokens: [
      'permissions:',
      'actions: read',
      'contents: read',
      'security-events: write',
      'github/codeql-action/init@v3',
      'github/codeql-action/analyze@v3',
      'security-extended',
      'security-and-quality',
      'javascript-typescript',
    ],
  },
  {
    path: '.github/workflows/dependency-review.yml',
    tokens: [
      'permissions:',
      'contents: read',
      'pull-requests: read',
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
      'permissions:',
      'contents: read',
      'environment: security-ci',
      'npm install --ignore-scripts',
      'npm run preflight',
      'npm run security:ci',
      'node scripts/security/check-step-up.mjs',
      'actions/setup-node@v6',
      'node-version: 22',
      'secrets.NEXT_PUBLIC_SUPABASE_URL',
      'secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'secrets.SUPABASE_SERVICE_ROLE_KEY',
      'secrets.SUPABASE_ACCESS_TOKEN',
      'secrets.AUDIT_CHAIN_SIGNING_SECRET',
      'secrets.EVIDENCE_PACK_SIGNING_SECRET',
      'timeout-minutes: 25',
      'cancel-in-progress: true',
      '$GITHUB_STEP_SUMMARY',
      'actions/upload-artifact@v7',
      'npm-audit-triage',
      'retention-days: 7',
      'if-no-files-found: warn',
    ],
  },
  {
    path: '.github/workflows/vercel-production.yml',
    tokens: [
      'environment: production',
      'npm run preflight',
      'npm run security:ci',
      'npm run build',
      'secrets.VERCEL_TOKEN',
      'secrets.VERCEL_ORG_ID',
      'secrets.VERCEL_PROJECT_ID',
      'secrets.NEXT_PUBLIC_SUPABASE_URL',
      'secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'secrets.SUPABASE_SERVICE_ROLE_KEY',
      'vercel pull',
      'vercel build --prod',
      'vercel deploy --prebuilt --prod',
    ],
  },
  {
    path: '.github/dependabot.yml',
    tokens: [
      'version: 2',
      'package-ecosystem: "npm"',
      'package-ecosystem: "github-actions"',
      'timezone: "Europe/Lisbon"',
      'open-pull-requests-limit: 1',
      'open-pull-requests-limit: 2',
      'prefix: "deps"',
      'prefix: "ci"',
      'include: "scope"',
      'version-update:semver-major',
      'dependencies',
      'security',
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
