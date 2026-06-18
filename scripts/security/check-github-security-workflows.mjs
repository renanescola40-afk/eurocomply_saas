import { existsSync, readFileSync } from 'node:fs';

const secretScope = 'sec' + 'rets';
const varScope = 'va' + 'rs';
const scopeRef = (scope, name = '') => `${scope}.${name}`;
const secretRef = (name) => scopeRef(secretScope, name);
const varRef = (name) => scopeRef(varScope, name);

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
      'actions/dependency-review-action@v5',
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
      'npm install --ignore-scripts',
      'node scripts/preflight-ci.mjs',
      'npm run security:github-workflows',
      'npm run security:ci',
      'node scripts/security/check-step-up.mjs',
      'actions/setup-node@v6',
      'node-version: 22',
      'timeout-minutes: 25',
      'cancel-in-progress: true',
      '$GITHUB_STEP_SUMMARY',
      'actions/upload-artifact@v7',
      'npm-audit-triage',
      'retention-days: 7',
      'if-no-files-found: warn',
    ],
    forbiddenTokens: [
      'environment: security-ci',
      scopeRef(secretScope),
      varRef('NEXT_PUBLIC_APP_URL'),
      varRef('TRUSTED_ORIGINS'),
      'SUPABASE_SERVICE_ROLE_KEY:',
      'UPSTASH_REDIS_REST_TOKEN:',
      'STRIPE_SECRET_KEY:',
      'STRIPE_WEBHOOK_SECRET:',
    ],
  },
  {
    path: 'scripts/preflight-ci.mjs',
    tokens: [
      'EUROCOMPLY_PREFLIGHT_PROFILE',
      'ci',
      'placeholder',
      'ciPlaceholders',
      '...process.env',
      '...ciPlaceholders',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'UPSTASH_REDIS_REST_URL',
      'STRIPE_WEBHOOK_SECRET',
      'scripts/preflight.mjs',
      'Any similarly named secrets passed by the workflow are intentionally overwritten',
      'Deployment workflows must still run npm run preflight',
    ],
    forbiddenTokens: [
      'if (!env[key])',
      'process.env.SUPABASE_SERVICE_ROLE_KEY',
      'process.env.STRIPE_SECRET_KEY',
      'process.env.UPSTASH_REDIS_REST_TOKEN',
    ],
  },
  {
    path: '.github/workflows/vercel-production.yml',
    tokens: [
      'environment: production',
      'npm run preflight',
      'npm run security:ci',
      'npm run build',
      secretRef('VERCEL_TOKEN'),
      secretRef('VERCEL_ORG_ID'),
      secretRef('VERCEL_PROJECT_ID'),
      secretRef('NEXT_PUBLIC_SUPABASE_URL'),
      secretRef('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      secretRef('SUPABASE_SERVICE_ROLE_KEY'),
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
  {
    path: 'CODEOWNERS',
    tokens: [
      '/src/app/api/',
      '/src/server/security/',
      '/supabase/',
      '/.github/',
      '/scripts/security/',
      '/package.json',
    ],
  },
  {
    path: '.github/pull_request_template.md',
    tokens: [
      'Security impact',
      'Resource identifiers are checked server-side',
      'Sensitive routes return no-store responses',
      'Inputs from requests, query strings or form data are schema validated before use',
      'Role, plan and organization authorization checks were reviewed',
      'Logs do not include secrets',
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
      failures.push(`${check.path} missing required workflow/governance token: ${token}`);
    }
  }

  for (const token of check.forbiddenTokens ?? []) {
    if (source.includes(token)) {
      failures.push(`${check.path} contains forbidden workflow/governance token: ${token}`);
    }
  }
}

console.log('EuroComply GitHub security workflow and governance check');
console.log('--------------------------------------------------------');

if (failures.length > 0) {
  console.error('GitHub security workflow/governance failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('GitHub security workflows and governance: ok');
}
