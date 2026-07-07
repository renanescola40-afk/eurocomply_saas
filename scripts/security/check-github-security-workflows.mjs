import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const required = [
  {
    path: '.github/workflows/vercel-production.yml',
    tokens: [
      'environment: production',
      'persist-credentials: false',
      'npm ci',
      'npm run lint',
      'npm run typecheck',
      'npm run test',
      'npm run build',
      'npm run security:ci',
      'npm run quality:routes',
      'npm run ops:vercel-readiness',
      'npm run release:readiness',
      'npm run release:enterprise-readiness',
      "if: env.RELEASE_TARGET == 'enterprise'",
      'vercel pull',
      'vercel build --prod',
      'vercel deploy --prebuilt --prod',
    ],
  },
  {
    path: '.github/workflows/security-ci.yml',
    tokens: [
      'name: RISCK COMPLY Security CI',
      'permissions:',
      'contents: read',
      'persist-credentials: false',
      'npm ci --ignore-scripts',
      'node scripts/preflight-ci.mjs',
      'npm run security:github-workflows',
      'npm run security:ci',
      'actions/setup-node@v6',
      'node-version: 22',
    ],
  },
  {
    path: '.github/workflows/full-security-suite.yml',
    tokens: [
      'name: Full Security Suite',
      'permissions:',
      'contents: read',
      'persist-credentials: false',
      'npm run lint',
      'npm run typecheck',
      'npm run test',
      'npm run build',
      'npm run security:ci',
      'npm run quality:routes',
    ],
  },
  {
    path: '.github/workflows/ci.yml',
    tokens: [
      'name: CI',
      'permissions:',
      'contents: read',
      'persist-credentials: false',
      'npm ci --ignore-scripts',
      'npm run security:package-lock',
      'node scripts/security/check-ci-required-checks-validation.mjs',
      'npm run lint',
      'npm run typecheck',
      'npm run test',
      'npm run build',
      'npm audit --audit-level=moderate',
      'npm run security:ci',
    ],
  },
  {
    path: '.github/workflows/code-review.yml',
    tokens: [
      'name: Code Review',
      'pull_request:',
      'permissions:',
      'contents: read',
      'pull-requests: read',
      'persist-credentials: false',
      'node scripts/security/check-workflow-sensitive-patterns.mjs',
      'node scripts/security/check-workflow-permissions.mjs',
      'node scripts/security/check-ci-required-checks-validation.mjs',
    ],
    forbiddenTokens: ['pull_request_target:', 'CHAT_TOKEN', 'DEEPSEEK_REVIEW_CREDENTIAL'],
  },
  {
    path: '.github/workflows/codeql.yml',
    tokens: ['permissions:', 'contents: read', 'security-events: write', 'persist-credentials: false'],
  },
  {
    path: '.github/workflows/dependency-review.yml',
    tokens: [
      'permissions:',
      'contents: read',
      'pull-requests: read',
      'persist-credentials: false',
      'actions/dependency-review-action@v5',
      'vulnerability-check: true',
      'license-check: false',
      'fail-on-severity: high',
      'comment-summary-in-pr: never',
      'npm audit --audit-level=high',
    ],
    forbiddenTokens: ['continue-on-error: true'],
  },
  {
    path: 'CODEOWNERS',
    tokens: ['/src/app/api/', '/src/server/security/', '/supabase/', '/.github/', '/scripts/security/', '/package.json'],
  },
  {
    path: 'scripts/security/check-ci-required-checks-validation.mjs',
    tokens: ['pull_request_target is forbidden', 'required_status_checks', 'missing_required_checks', 'branch_protection_ui_verified'],
  },
  {
    path: 'docs/security/evidence/runtime/ci-required-checks-validation.json',
    tokens: ['"status": "Complete"', '"branch_protection_ui_verified": false', '"missing_required_checks": []', '"pull_request_target_workflows": []'],
  },
];

const delegatedChecks = [
  'scripts/security/check-workflow-sensitive-patterns.mjs',
  'scripts/security/check-ci-required-checks-validation.mjs',
];

const failures = [];

for (const check of required) {
  if (!existsSync(check.path)) {
    failures.push(`${check.path} is missing`);
    continue;
  }

  const source = readFileSync(check.path, 'utf8');
  for (const token of check.tokens) {
    if (!source.includes(token)) failures.push(`${check.path} missing required workflow/governance token: ${token}`);
  }

  for (const token of check.forbiddenTokens ?? []) {
    if (source.includes(token)) failures.push(`${check.path} contains forbidden workflow/governance token: ${token}`);
  }
}

for (const script of delegatedChecks) {
  if (!existsSync(script)) {
    failures.push(`${script} is missing`);
    continue;
  }

  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) {
    failures.push(`${script} failed with status ${result.status}`);
  }
}

console.log('RISCK COMPLY P0 workflow governance check');
console.log('------------------------------------------');

if (failures.length > 0) {
  console.error('P0 workflow governance failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('P0 workflow governance: ok');
}
