import { existsSync, readFileSync } from 'node:fs';

const proxyPath = 'proxy.ts';
const sharedGuardPath = 'src/middleware.ts';
const rootMiddlewarePath = 'middleware.ts';

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
  '/risck-comply-home',
  '/riscos',
  '/documentos',
  '/raci',
  '/calendario-compliance',
  '/aprovacoes',
  '/ai-systems',
  '/ai-incidents',
];

const requiredGuardMarkers = [
  'clerkMiddleware',
  'await auth()',
  'NextResponse.redirect',
  'withPrivateNoStore',
  'ORGANIZATION_DASHBOARD_PATH',
];

const requiredGovernanceFiles = [
  'CODEOWNERS',
  '.github/pull_request_template.md',
  'docs/security/THREAT_MODEL.md',
  'docs/security/SECURITY_EXCEPTION_REGISTER.md',
  '.github/workflows/gitleaks.yml',
  '.gitleaks.toml',
  '.github/workflows/full-security-suite.yml',
  '.github/workflows/semgrep.yml',
  '.github/workflows/actionlint.yml',
  '.npmrc',
  'package.json',
];

const failures = [];

console.log('RISCK COMPLY protected route and release governance check');
console.log('----------------------------------------------------------');

if (!existsSync(proxyPath)) {
  failures.push('proxy.ts is missing. Request protection must have a root proxy entrypoint.');
}

if (existsSync(rootMiddlewarePath)) {
  failures.push('middleware.ts exists at the repository root. Use proxy.ts as the root entrypoint.');
}

let guardSource = '';

if (existsSync(proxyPath)) {
  const proxySource = readFileSync(proxyPath, 'utf8');
  guardSource += proxySource;

  if (proxySource.includes('./src/middleware') || proxySource.includes('src/middleware')) {
    if (!existsSync(sharedGuardPath)) {
      failures.push(`${sharedGuardPath} is missing, but proxy.ts delegates to it.`);
    } else {
      guardSource += `\n${readFileSync(sharedGuardPath, 'utf8')}`;
    }
  }
}

if (guardSource) {
  for (const segment of requiredProtectedSegments) {
    if (!guardSource.includes(`'${segment}'`) && !guardSource.includes(`"${segment}"`)) {
      failures.push(`Missing protected route segment in active request guard: ${segment}`);
    }
  }

  for (const marker of requiredGuardMarkers) {
    if (!guardSource.includes(marker)) {
      failures.push(`Active request guard missing marker: ${marker}`);
    }
  }

  const hasApiBypass = guardSource.includes("pathname.startsWith('/api')") || guardSource.includes('pathname.startsWith("/api")');
  if (!hasApiBypass) {
    failures.push('Active request guard must explicitly bypass /api routes.');
  }
}

for (const path of requiredGovernanceFiles) {
  if (!existsSync(path)) {
    failures.push(`${path} is missing. Release governance evidence is required.`);
  }
}

if (failures.length > 0) {
  console.error('Protected route/governance failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Protected routes and release governance: ok');
}
