import { existsSync, readFileSync } from 'node:fs';

const secretScope = 'sec' + 'rets';
const varScope = 'va' + 'rs';
const scopeRef = (scope, name = '') => `${scope}.${name}`;
const indexedScopeRef = (scope, name) => `${scope}['${name}']`;
const indexedSecretRef = (name) => indexedScopeRef(secretScope, name);
const varRef = (name) => scopeRef(varScope, name);

const checks = [
  {
    path: '.github/workflows/codeql.yml',
    tokens: [
      'permissions:',
      'actions: read',
      'contents: read',
      'security-events: write',
      'persist-credentials: false',
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
      'persist-credentials: false',
      'actions/dependency-review-action@v5',
      'fail-on-severity: high',
      'comment-summary-in-pr: never',
      'pull_request',
    ],
  },
  {
    path: '.github/workflows/full-security-suite.yml',
    tokens: [
      'name: Full Security Suite',
      'permissions:',
      'contents: read',
      'persist-credentials: false',
      'npm ci --ignore-scripts',
      'npm run lint',
      'npm run typecheck',
      'npm run test',
      'npm run test:e2e',
      'npm run build',
      'npm audit --audit-level=moderate',
      'npm run security:ci',
      'npm run quality:routes',
      'raven-actions/actionlint@v2',
      'gitleaks/gitleaks-action@v2',
      'semgrep scan',
      'github/codeql-action/analyze@v3',
      'actions/dependency-review-action@v5',
      'ossf/scorecard-action@v2.4.2',
      'npm sbom --json',
      'Enterprise merge/deploy gate',
    ],
  },
  {
    path: '.github/workflows/gitleaks.yml',
    tokens: [
      'name: Gitleaks',
      'permissions:',
      'contents: read',
      'pull-requests: read',
      'fetch-depth: 0',
      'persist-credentials: false',
      'gitleaks/gitleaks-action@v2',
      'Scan repository for accidental secret exposure',
    ],
  },
  {
    path: '.github/workflows/security-ci.yml',
    tokens: [
      'permissions:',
      'contents: read',
      'persist-credentials: false',
      'npm ci --ignore-scripts',
      'node scripts/preflight-ci.mjs',
      'npm run security:github-workflows',
      'npm run security:ci',
      'npm run security:production-secrets',
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
      'npm install --ignore-scripts',
    ],
  },
  {
    path: '.github/workflows/secret-scanning.yml',
    tokens: [
      'Production secret readiness gate',
      'npm ci --ignore-scripts',
      'npm run security:production-secrets',
      'permissions:',
      'contents: read',
      'persist-credentials: false',
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
      'persist-credentials: false',
      'npm ci --ignore-scripts',
      'npm run preflight',
      'npm run security:ci',
      'npm run build',
      indexedSecretRef('VERCEL_TOKEN'),
      indexedSecretRef('VERCEL_ORG_ID'),
      indexedSecretRef('VERCEL_PROJECT_ID'),
      indexedSecretRef('NEXT_PUBLIC_SUPABASE_URL'),
      indexedSecretRef('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      indexedSecretRef('SUPABASE_SERVICE_ROLE_KEY'),
      indexedSecretRef('STRIPE_SECRET_KEY'),
      indexedSecretRef('SENTRY_AUTH_TOKEN'),
      indexedSecretRef('CRON_SECRET'),
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
