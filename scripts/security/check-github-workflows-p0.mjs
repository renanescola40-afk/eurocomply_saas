import { existsSync, readFileSync } from 'node:fs';

const required = [
  {
    path: '.github/workflows/vercel-production.yml',
    tokens: [
      'workflow_dispatch:',
      'release_sha:',
      'confirmation:',
      'DEPLOY_PRODUCTION',
      'environment: production',
      'ref: main',
      'ref: ${{ inputs.release_sha }}',
      'fetch-depth: 0',
      'persist-credentials: false',
      'test "$(git rev-parse origin/main)" = "${RELEASE_SHA,,}"',
      'test "$(git rev-parse HEAD)" = "${RELEASE_SHA,,}"',
      'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0',
      'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
      "VERCEL_CLI_VERSION: '56.3.2'",
      'npm ci',
      'npm run lint',
      'npm run typecheck',
      'npm run test',
      'npm run build',
      'npm run security:ci',
      'npm run quality:routes',
      'npm run ops:vercel-readiness',
      '"vercel@${VERCEL_CLI_VERSION}" pull',
      '"vercel@${VERCEL_CLI_VERSION}" build --prod',
      '"vercel@${VERCEL_CLI_VERSION}" deploy --prebuilt --prod',
    ],
    forbiddenTokens: [
      '\n  push:',
      'CLERK_',
      'actions/checkout@v',
      'actions/setup-node@v',
      'npx vercel ',
    ],
    anyOf: [
      ['npm run release:production-final'],
      ['npm run release:enterprise-readiness'],
    ],
  },
  {
    path: 'package.json',
    tokens: [
      '"release:production-final": "node scripts/release/run-public-production-release.mjs"',
      '"release:enterprise-readiness": "RELEASE_TARGET=enterprise RISCK_COMPLY_ENTERPRISE_RELEASE=true npm run release:production-final"',
    ],
  },
  {
    path: '.github/workflows/enterprise-production-gate.yml',
    tokens: [
      'name: Enterprise Production Gate',
      'npm run release:production-final',
      'PLAYWRIGHT_USE_PRODUCTION_SERVER',
      'Enterprise release env preflight',
      'enterprise-production-final-evidence',
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
      'npm run security:ci',
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

  if (Array.isArray(check.anyOf)) {
    const satisfied = check.anyOf.some((tokens) => tokens.every((token) => source.includes(token)));
    if (!satisfied) failures.push(`${check.path} must include one accepted canonical final gate path: ${check.anyOf.map((tokens) => tokens.join(' + ')).join(' OR ')}`);
  }

  if (Array.isArray(check.forbiddenTokens)) {
    for (const token of check.forbiddenTokens) {
      if (source.includes(token)) failures.push(`${check.path} contains forbidden workflow/governance token: ${token.trim()}`);
    }
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
