import { existsSync, readFileSync } from 'node:fs';

const proxyPath = 'proxy.ts';
const deprecatedMiddlewarePath = 'middleware.ts';

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

const failures = [];

console.log('EuroComply protected route coverage check');
console.log('-----------------------------------------');

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

if (failures.length > 0) {
  console.error('Protected route coverage failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Protected route coverage: ok');
}
