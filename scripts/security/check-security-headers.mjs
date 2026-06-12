import { existsSync, readFileSync } from 'node:fs';

const proxyPath = 'proxy.ts';
const nextConfigPath = 'next.config.ts';
const failures = [];

const requiredProxyTokens = [
  'X-Frame-Options',
  'DENY',
  'X-Content-Type-Options',
  'nosniff',
  'Referrer-Policy',
  'strict-origin-when-cross-origin',
  'Permissions-Policy',
  'Strict-Transport-Security',
  'max-age=63072000',
  'includeSubDomains',
  'preload',
  'Content-Security-Policy',
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "form-action 'self' https://checkout.stripe.com",
  'upgrade-insecure-requests',
  'applySecurityHeaders',
];

const requiredNextConfigTokens = [
  'poweredByHeader',
  'false',
  'compress',
];

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function assertContains(source, token, file) {
  if (!source.includes(token)) failures.push(`${file} missing required security token: ${token}`);
}

function assertNotProductionUnsafeEval(source) {
  const productionScriptSrc = source.match(/\?\s*"script-src[^\n]+"\s*:\s*"script-src[^\n]+"/s)?.[0] ?? '';
  if (productionScriptSrc.includes('unsafe-eval')) {
    failures.push('proxy.ts production CSP must not include unsafe-eval');
  }
}

function assertNoWildcardCsp(source) {
  const suspiciousDirectives = [
    /default-src[^"'`\n;]*\*/i,
    /script-src[^"'`\n;]*\*/i,
    /connect-src[^"'`\n;]*\*/i,
    /frame-ancestors[^"'`\n;]*\*/i,
    /object-src[^"'`\n;]*\*/i,
  ];

  for (const pattern of suspiciousDirectives) {
    if (pattern.test(source)) {
      failures.push(`proxy.ts has wildcard in high-risk CSP directive: ${pattern}`);
    }
  }
}

console.log('EuroComply security headers regression check');
console.log('---------------------------------------------');

if (!existsSync(proxyPath)) {
  failures.push('proxy.ts is required for security headers and auth protection.');
} else {
  const proxy = readFileSync(proxyPath, 'utf8');
  for (const token of requiredProxyTokens) assertContains(proxy, token, proxyPath);
  assertNotProductionUnsafeEval(proxy);
  assertNoWildcardCsp(proxy);

  if (!/isProduction[\s\S]+script-src[\s\S]+unsafe-eval/.test(proxy)) {
    failures.push('proxy.ts should keep unsafe-eval restricted to non-production development CSP only.');
  }
}

const nextConfig = readOptional(nextConfigPath);
if (!nextConfig) {
  failures.push('next.config.ts is missing; security config should be explicit.');
} else {
  for (const token of requiredNextConfigTokens) assertContains(nextConfig, token, nextConfigPath);
}

if (failures.length > 0) {
  console.error('Security header failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Security headers regression check: ok');
}
