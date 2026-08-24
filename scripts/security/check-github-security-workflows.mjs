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
      "VERCEL_CLI_VERSION: '56.3.2'",
      '"vercel@${VERCEL_CLI_VERSION}" pull',
      '"vercel@${VERCEL_CLI_VERSION}" build --prod',
      '"vercel@${VERCEL_CLI_VERSION}" deploy --prebuilt --prod',
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
      'actions/setup-node@v7',
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
      'run-security-ci-without-audit.mjs',
      'npm run quality:routes',
    ],
  },
  {
    path: '.github/workflows/codeql.yml',
    tokens: ['permissions:', 'contents: read', 'security-events: write', 'persist-credentials: false'],
  },
  {
    path: '.github/workflows/dependency-review.yml',
    tokens: ['permissions:', 'contents: read', 'pull-requests: read', 'persist-credentials: false'],
  },
  {
    path: 'CODEOWNERS',
    tokens: ['/src/app/api/', '/src/server/security/', '/supabase/', '/.github/', '/scripts/security/', '/package.json'],
  },
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
