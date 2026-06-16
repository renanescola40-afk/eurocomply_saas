import { existsSync, readFileSync } from 'node:fs';

const proxyPath = 'proxy.ts';
const deprecatedMiddlewarePath = 'middleware.ts';
const codeownersPath = 'CODEOWNERS';
const prTemplatePath = '.github/pull_request_template.md';
const threatModelPath = 'docs/security/THREAT_MODEL.md';
const exceptionRegisterPath = 'docs/security/SECURITY_EXCEPTION_REGISTER.md';
const gitleaksWorkflowPath = '.github/workflows/gitleaks.yml';
const gitleaksConfigPath = '.gitleaks.toml';
const gitignorePath = '.gitignore';
const npmrcPath = '.npmrc';
const packageJsonPath = 'package.json';

const requiredProtectedSegments = [
  '/dashboard',
  '/settings',
  '/billing',
  '/team',
  '/profile',
  '/enterprise-readiness',
  '/security-center',
  '/security-questionnaire',
  '/retention-center',
  '/continuity-center',
  '/vendor-assurance',
  '/audit-pack',
  '/notificacoes',
  '/auditoria',
  '/eurocomply-home',
  '/riscos',
  '/documentos',
  '/raci',
  '/calendario-compliance',
  '/aprovacoes',
  '/ai-systems',
  '/ai-incidents',
];

const requiredSecurityTokens = [
  'assertSafeEnvironment',
  'createServerClient',
  'applySecurityHeaders',
  'Content-Security-Policy',
  'Strict-Transport-Security',
  'frame-ancestors',
  'matchesSegment(pathname, protectedSegments)',
  'NextResponse.redirect',
];

const governanceChecks = [
  {
    path: codeownersPath,
    tokens: ['/src/app/api/', '/src/server/security/', '/supabase/', '/.github/', '/scripts/security/', '/package.json'],
  },
  {
    path: prTemplatePath,
    tokens: [
      'Security impact',
      'Resource identifiers are checked server-side',
      'Sensitive routes return no-store responses',
      'Inputs from requests, query strings or form data are schema validated before use',
      'Role, plan and organization authorization checks were reviewed',
    ],
  },
  {
    path: threatModelPath,
    tokens: ['Threat Model', 'Security objectives', 'Trust boundaries', 'High-priority threats', 'Release rule', 'Open risks'],
  },
  {
    path: exceptionRegisterPath,
    tokens: ['Security Exception Register', 'Automatic No-Go cases', 'Compensating control', 'Expiry date', 'Closure evidence'],
  },
  {
    path: gitleaksWorkflowPath,
    tokens: ['gitleaks/gitleaks-action@v2', 'fetch-depth: 0', 'persist-credentials: false', 'pull_request'],
  },
  {
    path: gitleaksConfigPath,
    tokens: ['EuroComply Gitleaks Configuration', 'eurocomply-public-env-sensitive-name', 'eurocomply-provider-key-like-value'],
  },
  {
    path: gitignorePath,
    tokens: ['.env*', '!.env.example', '.vercel', 'security-endpoints-inventory.json', 'npm-audit*.json'],
  },
  {
    path: npmrcPath,
    tokens: ['package-lock=true', 'audit=true', 'fund=false', 'save-exact=true'],
  },
  {
    path: packageJsonPath,
    tokens: ['"packageManager": "npm@10.8.2"', '"security:public-secrets"', '"security:supply-chain"', '"security:protected-routes"', '"security:api-guards"'],
  },
];

const failures = [];

console.log('EuroComply protected route and release governance check');
console.log('-------------------------------------------------------');

if (!existsSync(proxyPath)) {
  failures.push('proxy.ts is missing. Next 16 proxy-based route protection is required.');
}

if (existsSync(deprecatedMiddlewarePath)) {
  failures.push('middleware.ts exists. Use proxy.ts only to avoid deprecated middleware convention drift.');
}

if (existsSync(proxyPath)) {
  const source = readFileSync(proxyPath, 'utf8');

  for (const segment of requiredProtectedSegments) {
    if (!source.includes(`'${segment}'`) && !source.includes(`"${segment}"`)) {
      failures.push(`Missing protected route segment in proxy.ts: ${segment}`);
    }
  }

  for (const token of requiredSecurityTokens) {
    if (!source.includes(token)) {
      failures.push(`proxy.ts missing required security token: ${token}`);
    }
  }

  const hasApiBypass = source.includes("pathname.startsWith('/api')") || source.includes('pathname.startsWith("/api")');
  if (!hasApiBypass) {
    failures.push('proxy.ts should explicitly bypass /api routes; API routes must enforce their own server-side guards.');
  }
}

for (const check of governanceChecks) {
  if (!existsSync(check.path)) {
    failures.push(`${check.path} is missing. Release governance evidence is required.`);
    continue;
  }

  const source = readFileSync(check.path, 'utf8');
  for (const token of check.tokens) {
    if (!source.includes(token)) {
      failures.push(`${check.path} missing required governance token: ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Protected route/governance failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Protected routes and release governance: ok');
}
