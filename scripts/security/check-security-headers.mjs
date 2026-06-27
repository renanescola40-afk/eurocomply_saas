import { existsSync, readFileSync } from 'node:fs';

const proxyPath = 'proxy.ts';
const nextConfigPath = 'next.config.ts';
const failures = [];

const headerName = (...parts) => parts.join('-');
const requiredHeaderTokens = [
  headerName('X', 'Frame', 'Options'),
  'DENY',
  headerName('X', 'Content', 'Type', 'Options'),
  'nosniff',
  headerName('Referrer', 'Policy'),
  'strict-origin-when-cross-origin',
  headerName('Permissions', 'Policy'),
  headerName('Strict', 'Transport', 'Security'),
  'max-age=63072000',
  'includeSubDomains',
  'preload',
  headerName('Content', 'Security', 'Policy'),
  'frame-ancestors',
  'upgrade-insecure-requests',
  'securityHeaders',
  'headers()',
];

const requiredProxyTokens = ['src/middleware', 'config'];
const requiredNextConfigTokens = ['poweredByHeader', 'false', 'compress'];

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function assertContains(source, token, file) {
  if (!source.includes(token)) failures.push(`${file} missing required security token: ${token}`);
}

console.log('RISCK COMPLY security headers regression check');
console.log('---------------------------------------------');

if (!existsSync(proxyPath)) {
  failures.push('proxy.ts is required for request protection.');
} else {
  const proxy = readFileSync(proxyPath, 'utf8');
  for (const token of requiredProxyTokens) assertContains(proxy, token, proxyPath);
}

const nextConfig = readOptional(nextConfigPath);
if (!nextConfig) {
  failures.push('next.config.ts is missing; security config should be explicit.');
} else {
  for (const token of requiredNextConfigTokens) assertContains(nextConfig, token, nextConfigPath);
  for (const token of requiredHeaderTokens) assertContains(nextConfig, token, nextConfigPath);
}

if (failures.length > 0) {
  console.error('Security header failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Security headers regression check: ok');
}
